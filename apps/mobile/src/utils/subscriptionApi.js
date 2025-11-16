import { frappeRequest } from './frappeApi';

/**
 * Activate or update a subscription for the current user
 * Updates the Customer doctype's custom_tookio_subscription_plan field
 */
export async function activateSubscription(planName, paymentMethod, transactionId) {
  try {
    const response = await frappeRequest('/api/method/tookio_shop.api.activate_subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_name: planName,
        payment_method: paymentMethod,
        transaction_id: transactionId,
      }),
    });

    return response;
  } catch (error) {
    console.error('Error activating subscription:', error);
    throw error;
  }
}

/**
 * Cancel the current subscription
 */
export async function cancelSubscription() {
  try {
    const response = await frappeRequest('/api/method/tookio_shop.api.cancel_subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}

/**
 * Get subscription details for the current user
 */
export async function getSubscriptionDetails() {
  try {
    const response = await frappeRequest('/api/method/tookio_shop.api.get_subscription_details', {
      method: 'GET',
    });

    return response.message;
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    throw error;
  }
}

/**
 * Verify M-Pesa payment
 */
export async function verifyMpesaPayment(checkoutRequestId) {
  try {
    const response = await frappeRequest('/api/method/tookio_shop.api.verify_mpesa_payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkout_request_id: checkoutRequestId,
      }),
    });

    return response.message;
  } catch (error) {
    console.error('Error verifying M-Pesa payment:', error);
    throw error;
  }
}

/**
 * Initiate M-Pesa STK Push
 */
export async function initiateMpesaPayment(phoneNumber, amount, planName) {
  try {
    const response = await frappeRequest('/api/method/tookio_shop.api.initiate_mpesa_payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        amount: amount,
        plan_name: planName,
      }),
    });

    return response.message;
  } catch (error) {
    console.error('Error initiating M-Pesa payment:', error);
    throw error;
  }
}

/**
 * Create Stripe payment intent
 */
export async function createStripePaymentIntent(amount, currency, planName) {
  try {
    const response = await frappeRequest('/api/method/tookio_shop.api.create_payment_intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        plan_name: planName,
      }),
    });

    return response.message;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}
