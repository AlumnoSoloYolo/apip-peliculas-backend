const { PayPalHttpClient, Environment } = require('@paypal/paypal-server-sdk');

function getPayPalClient() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    const environment = new Environment(
        clientId,
        clientSecret,
        process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
    );

    // El cliente también se importa directamente
    return new PayPalHttpClient(environment);
}

module.exports = { getPayPalClient };