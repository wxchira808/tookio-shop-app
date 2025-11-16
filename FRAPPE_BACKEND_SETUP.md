# Frappe Backend Setup for In-App Subscriptions

This guide shows you how to add the necessary API endpoints to your Frappe app to support the new in-app subscription system.

## 1. Add API Endpoints

Create or update `tookio_shop/api.py` in your Frappe app with these functions:

```python
import frappe
from frappe import _
from datetime import datetime, timedelta
import json

@frappe.whitelist()
def activate_subscription(plan_name, payment_method, transaction_id):
    """
    Activate or update subscription for the current user
    Updates the Customer doctype's custom_tookio_subscription_plan
    """
    try:
        user_email = frappe.session.user

        # Find Customer linked to this user via portal_users child table
        customers = frappe.get_all(
            'Customer',
            filters=[['portal_users', 'user', '=', user_email]],
            fields=['name']
        )

        if not customers:
            return {
                'status': 'error',
                'message': 'No customer found for this user'
            }

        customer_id = customers[0].name
        customer = frappe.get_doc('Customer', customer_id)

        # Update subscription fields
        customer.custom_tookio_subscription_plan = plan_name
        customer.custom_subscription_expiry_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        customer.save(ignore_permissions=True)

        # Log the payment transaction
        payment_log = frappe.get_doc({
            'doctype': 'Payment Log',  # Create this doctype if you don't have it
            'customer': customer_id,
            'plan': plan_name,
            'amount': get_plan_price(plan_name),
            'payment_method': payment_method,
            'transaction_id': transaction_id,
            'status': 'Success',
            'date': datetime.now()
        })
        payment_log.insert(ignore_permissions=True)

        frappe.db.commit()

        return {
            'status': 'success',
            'message': f'Successfully activated {plan_name} plan',
            'expiry_date': customer.custom_subscription_expiry_date
        }

    except Exception as e:
        frappe.log_error(f'Subscription Activation Error: {str(e)}')
        return {
            'status': 'error',
            'message': str(e)
        }

@frappe.whitelist()
def cancel_subscription():
    """
    Cancel the current subscription (downgrade to free plan)
    """
    try:
        user_email = frappe.session.user

        customers = frappe.get_all(
            'Customer',
            filters=[['portal_users', 'user', '=', user_email]],
            fields=['name']
        )

        if not customers:
            return {
                'status': 'error',
                'message': 'No customer found for this user'
            }

        customer_id = customers[0].name
        customer = frappe.get_doc('Customer', customer_id)

        # Downgrade to free plan
        customer.custom_tookio_subscription_plan = 'Free'
        customer.custom_subscription_expiry_date = None
        customer.save(ignore_permissions=True)

        frappe.db.commit()

        return {
            'status': 'success',
            'message': 'Subscription cancelled successfully'
        }

    except Exception as e:
        frappe.log_error(f'Subscription Cancellation Error: {str(e)}')
        return {
            'status': 'error',
            'message': str(e)
        }

@frappe.whitelist()
def get_subscription_details():
    """
    Get subscription details for the current user
    """
    try:
        user_email = frappe.session.user

        customers = frappe.get_all(
            'Customer',
            filters=[['portal_users', 'user', '=', user_email]],
            fields=['name', 'custom_tookio_subscription_plan', 'custom_subscription_expiry_date']
        )

        if not customers:
            return {
                'status': 'error',
                'message': 'No customer found for this user'
            }

        customer = customers[0]

        return {
            'status': 'success',
            'plan': customer.custom_tookio_subscription_plan or 'Free',
            'expiry_date': customer.custom_subscription_expiry_date,
            'is_active': is_subscription_active(customer)
        }

    except Exception as e:
        frappe.log_error(f'Get Subscription Details Error: {str(e)}')
        return {
            'status': 'error',
            'message': str(e)
        }

def is_subscription_active(customer):
    """Check if subscription is active"""
    if not customer.custom_subscription_expiry_date:
        return customer.custom_tookio_subscription_plan == 'Free'

    expiry = datetime.strptime(customer.custom_subscription_expiry_date, '%Y-%m-%d')
    return datetime.now() < expiry

def get_plan_price(plan_name):
    """Get plan price"""
    prices = {
        'Free': 0,
        'Starter': 4,
        'Business': 9
    }
    return prices.get(plan_name, 0)

# ==========================================
# M-PESA INTEGRATION (Daraja API)
# ==========================================

@frappe.whitelist()
def initiate_mpesa_payment(phone_number, amount, plan_name):
    """
    Initiate M-Pesa STK Push
    """
    try:
        import requests
        from requests.auth import HTTPBasicAuth

        # Get M-Pesa credentials from Site Config
        consumer_key = frappe.conf.get('mpesa_consumer_key')
        consumer_secret = frappe.conf.get('mpesa_consumer_secret')
        shortcode = frappe.conf.get('mpesa_shortcode')  # Your till number: 6547212
        passkey = frappe.conf.get('mpesa_passkey')

        if not all([consumer_key, consumer_secret, shortcode, passkey]):
            return {
                'status': 'error',
                'message': 'M-Pesa credentials not configured'
            }

        # Get access token
        auth_url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        # Use this for production: https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials

        auth_response = requests.get(auth_url, auth=HTTPBasicAuth(consumer_key, consumer_secret))
        access_token = auth_response.json().get('access_token')

        # STK Push request
        stk_url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        # Use this for production: https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f'{shortcode}{passkey}{timestamp}'.encode()).decode()

        # Format phone number (remove leading 0 or +254, add 254)
        if phone_number.startswith('0'):
            phone_number = '254' + phone_number[1:]
        elif phone_number.startswith('+254'):
            phone_number = phone_number[1:]
        elif not phone_number.startswith('254'):
            phone_number = '254' + phone_number

        payload = {
            'BusinessShortCode': shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'TransactionType': 'CustomerBuyGoodsOnline',  # For Till Number
            'Amount': int(amount),
            'PartyA': phone_number,
            'PartyB': shortcode,
            'PhoneNumber': phone_number,
            'CallBackURL': f"{frappe.utils.get_url()}/api/method/tookio_shop.api.mpesa_callback",
            'AccountReference': plan_name,
            'TransactionDesc': f'Tookio Shop {plan_name} Subscription'
        }

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        response = requests.post(stk_url, json=payload, headers=headers)
        result = response.json()

        if result.get('ResponseCode') == '0':
            # Store checkout request ID for verification
            checkout_request_id = result.get('CheckoutRequestID')

            # Create a pending payment record
            payment_request = frappe.get_doc({
                'doctype': 'Payment Request',  # Create this doctype
                'user': frappe.session.user,
                'plan': plan_name,
                'amount': amount,
                'phone_number': phone_number,
                'checkout_request_id': checkout_request_id,
                'status': 'Pending',
                'payment_method': 'M-Pesa'
            })
            payment_request.insert(ignore_permissions=True)
            frappe.db.commit()

            return {
                'status': 'success',
                'message': 'STK push sent successfully',
                'checkout_request_id': checkout_request_id
            }
        else:
            return {
                'status': 'error',
                'message': result.get('errorMessage', 'Failed to initiate payment')
            }

    except Exception as e:
        frappe.log_error(f'M-Pesa Initiation Error: {str(e)}')
        return {
            'status': 'error',
            'message': str(e)
        }

@frappe.whitelist(allow_guest=True)
def mpesa_callback():
    """
    M-Pesa callback handler
    """
    try:
        import base64

        callback_data = json.loads(frappe.request.data)

        # Extract data
        result_code = callback_data['Body']['stkCallback']['ResultCode']
        checkout_request_id = callback_data['Body']['stkCallback']['CheckoutRequestID']

        # Find the payment request
        payment_requests = frappe.get_all(
            'Payment Request',
            filters={'checkout_request_id': checkout_request_id},
            fields=['name', 'plan', 'user']
        )

        if not payment_requests:
            frappe.log_error('M-Pesa Callback: Payment request not found')
            return

        payment_request = frappe.get_doc('Payment Request', payment_requests[0].name)

        if result_code == 0:
            # Payment successful
            payment_request.status = 'Completed'
            payment_request.save(ignore_permissions=True)

            # Activate subscription
            user_email = payment_request.user
            customers = frappe.get_all(
                'Customer',
                filters=[['portal_users', 'user', '=', user_email]],
                fields=['name']
            )

            if customers:
                customer = frappe.get_doc('Customer', customers[0].name)
                customer.custom_tookio_subscription_plan = payment_request.plan
                customer.custom_subscription_expiry_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
                customer.save(ignore_permissions=True)

            frappe.db.commit()
        else:
            # Payment failed
            payment_request.status = 'Failed'
            payment_request.save(ignore_permissions=True)
            frappe.db.commit()

        return {'status': 'success'}

    except Exception as e:
        frappe.log_error(f'M-Pesa Callback Error: {str(e)}')
        return {'status': 'error'}

@frappe.whitelist()
def verify_mpesa_payment(checkout_request_id):
    """
    Check payment status
    """
    try:
        payment_requests = frappe.get_all(
            'Payment Request',
            filters={'checkout_request_id': checkout_request_id},
            fields=['name', 'status', 'plan']
        )

        if not payment_requests:
            return {
                'status': 'error',
                'message': 'Payment request not found'
            }

        payment_request = payment_requests[0]

        return {
            'status': 'success',
            'payment_status': payment_request.status,
            'plan': payment_request.plan
        }

    except Exception as e:
        frappe.log_error(f'Verify M-Pesa Payment Error: {str(e)}')
        return {
            'status': 'error',
            'message': str(e)
        }

# ==========================================
# STRIPE INTEGRATION
# ==========================================

@frappe.whitelist()
def create_payment_intent(amount, currency, plan_name):
    """
    Create Stripe payment intent
    """
    try:
        import stripe

        # Get Stripe secret key from Site Config
        stripe.api_key = frappe.conf.get('stripe_secret_key')

        if not stripe.api_key:
            return {
                'status': 'error',
                'message': 'Stripe not configured'
            }

        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=amount,  # Amount in cents
            currency=currency,
            metadata={
                'plan_name': plan_name,
                'user_email': frappe.session.user
            }
        )

        # Store payment intent for verification
        payment_intent_doc = frappe.get_doc({
            'doctype': 'Payment Intent',  # Create this doctype
            'user': frappe.session.user,
            'plan': plan_name,
            'amount': amount / 100,
            'currency': currency,
            'intent_id': intent.id,
            'status': 'Pending',
            'payment_method': 'Stripe'
        })
        payment_intent_doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            'status': 'success',
            'client_secret': intent.client_secret,
            'intent_id': intent.id
        }

    except Exception as e:
        frappe.log_error(f'Stripe Payment Intent Error: {str(e)}')
        return {
            'status': 'error',
            'message': str(e)
        }

@frappe.whitelist(allow_guest=True)
def stripe_webhook():
    """
    Stripe webhook handler
    """
    try:
        import stripe

        stripe.api_key = frappe.conf.get('stripe_secret_key')
        endpoint_secret = frappe.conf.get('stripe_webhook_secret')

        payload = frappe.request.data
        sig_header = frappe.request.headers.get('Stripe-Signature')

        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )

        if event.type == 'payment_intent.succeeded':
            payment_intent = event.data.object
            intent_id = payment_intent.id

            # Find payment intent record
            payment_intents = frappe.get_all(
                'Payment Intent',
                filters={'intent_id': intent_id},
                fields=['name', 'plan', 'user']
            )

            if payment_intents:
                payment_intent_doc = frappe.get_doc('Payment Intent', payment_intents[0].name)
                payment_intent_doc.status = 'Completed'
                payment_intent_doc.save(ignore_permissions=True)

                # Activate subscription
                user_email = payment_intent_doc.user
                customers = frappe.get_all(
                    'Customer',
                    filters=[['portal_users', 'user', '=', user_email]],
                    fields=['name']
                )

                if customers:
                    customer = frappe.get_doc('Customer', customers[0].name)
                    customer.custom_tookio_subscription_plan = payment_intent_doc.plan
                    customer.custom_subscription_expiry_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
                    customer.save(ignore_permissions=True)

                frappe.db.commit()

        return {'status': 'success'}

    except Exception as e:
        frappe.log_error(f'Stripe Webhook Error: {str(e)}')
        return {'status': 'error'}
```

## 2. Add to `site_config.json`

Add these configurations to your Frappe site's `site_config.json`:

```json
{
  "mpesa_consumer_key": "YOUR_MPESA_CONSUMER_KEY",
  "mpesa_consumer_secret": "YOUR_MPESA_CONSUMER_SECRET",
  "mpesa_shortcode": "6547212",
  "mpesa_passkey": "YOUR_MPESA_PASSKEY",
  "stripe_secret_key": "sk_test_YOUR_STRIPE_SECRET_KEY",
  "stripe_publishable_key": "pk_test_YOUR_STRIPE_PUBLISHABLE_KEY",
  "stripe_webhook_secret": "whsec_YOUR_WEBHOOK_SECRET"
}
```

## 3. Create Required Doctypes

You'll need to create these doctypes in Frappe:

### Payment Log
- customer (Link to Customer)
- plan (Data)
- amount (Currency)
- payment_method (Select: Stripe, M-Pesa)
- transaction_id (Data)
- status (Select: Success, Failed)
- date (Datetime)

### Payment Request (for M-Pesa)
- user (Data)
- plan (Data)
- amount (Currency)
- phone_number (Data)
- checkout_request_id (Data)
- status (Select: Pending, Completed, Failed)
- payment_method (Data)

### Payment Intent (for Stripe)
- user (Data)
- plan (Data)
- amount (Currency)
- currency (Data)
- intent_id (Data)
- status (Select: Pending, Completed, Failed)
- payment_method (Data)

## 4. Install Required Python Packages

```bash
# In your Frappe bench
bench pip install stripe requests
```

## 5. Get API Credentials

### M-Pesa (Safaricom Daraja)
1. Go to https://developer.safaricom.co.ke
2. Create an app
3. Get Consumer Key and Consumer Secret
4. Get your Lipa Na M-Pesa Online Passkey
5. For Till Number, you already have: **6547212 (Tookio Solutions)**

### Stripe
1. Go to https://dashboard.stripe.com
2. Get your API keys (test mode first)
3. Set up webhooks pointing to: `https://shop.tookio.co.ke/api/method/tookio_shop.api.stripe_webhook`
4. Listen for `payment_intent.succeeded` events

## 6. Test the Integration

1. Start with **Sandbox/Test mode** for both services
2. Test M-Pesa with test phone numbers
3. Test Stripe with test card: `4242 4242 4242 4242`
4. Verify subscriptions are activating correctly
5. Switch to **Production** when ready

## Next Steps for Mobile App

After setting up the backend, you'll need to:

1. Install Stripe React Native SDK in the mobile app
2. Add Stripe payment UI
3. Test the full payment flow
4. Add subscription enforcement (limit checks)

Let me know when you're ready and I'll help with those next steps!
