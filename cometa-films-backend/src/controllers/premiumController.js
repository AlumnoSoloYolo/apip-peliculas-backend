const User = require('../models/user.model');
const paypal = require('@paypal/paypal-server-sdk');

// Configuración de PayPal
function getPayPalClient() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    // Usar sandbox para desarrollo y producción para producción
    const environment = process.env.NODE_ENV === 'production'
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret);

    return new paypal.core.PayPalHttpClient(environment);
}

// Obtener el estado premium del usuario
exports.getPremiumStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).select('isPremium premiumExpiry');

        // Calcular días restantes si es premium
        let remainingDays = 0;
        if (user.isPremium && user.premiumExpiry) {
            const now = new Date();
            const expiry = new Date(user.premiumExpiry);
            remainingDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        }

        res.json({
            isPremium: user.isPremium,
            premiumExpiry: user.premiumExpiry,
            remainingDays: remainingDays > 0 ? remainingDays : 0
        });
    } catch (error) {
        console.error('Error al obtener estado premium:', error);
        res.status(500).json({
            message: 'Error al obtener estado premium',
            error: error.message
        });
    }
};

// Crear orden de PayPal para la suscripción
exports.createSubscription = async (req, res) => {
    try {
        const paypalClient = getPayPalClient();
        const request = new paypal.orders.OrdersCreateRequest();

        // Configurar la orden
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'EUR',
                    value: '5.99'
                },
                description: 'Suscripción Premium de CometaCine - 1 mes'
            }],
            application_context: {
                brand_name: 'CometaCine',
                landing_page: 'BILLING',
                user_action: 'PAY_NOW',
                return_url: `${process.env.FRONTEND_URL}/premium/success`,
                cancel_url: `${process.env.FRONTEND_URL}/premium/cancel`
            }
        });

        // Ejecutar la solicitud
        const order = await paypalClient.execute(request);

        // Guardar temporalmente la información del pedido
        // Puedes usar una colección de órdenes pendientes en MongoDB si es necesario

        // Devolver los enlaces para el checkout
        const approveUrl = order.result.links.find(link => link.rel === 'approve').href;

        res.json({
            orderId: order.result.id,
            approveUrl: approveUrl
        });
    } catch (error) {
        console.error('Error al crear suscripción PayPal:', error);
        res.status(500).json({
            message: 'Error al iniciar el proceso de pago',
            error: error.message
        });
    }
};

// Capturar el pago y activar la suscripción
exports.capturePayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user.id;

        if (!orderId) {
            return res.status(400).json({ message: 'ID de orden requerido' });
        }

        // Capturar el pago
        const paypalClient = getPayPalClient();
        const request = new paypal.orders.OrdersCaptureRequest(orderId);
        request.requestBody({});

        const capture = await paypalClient.execute(request);

        if (capture.result.status === 'COMPLETED') {
            // Calcular fecha de expiración (1 mes desde ahora)
            const now = new Date();
            const expiryDate = new Date(now);
            expiryDate.setMonth(now.getMonth() + 1);

            // Actualizar usuario como premium
            await User.findByIdAndUpdate(userId, {
                isPremium: true,
                premiumExpiry: expiryDate,
                paypalSubscriptionId: orderId, // Guardar el ID de la orden como referencia
                $push: {
                    premiumHistory: {
                        action: 'subscribed',
                        date: new Date(),
                        details: `Suscripción Premium activada - Orden PayPal: ${orderId}`
                    }
                }
            });

            res.json({
                success: true,
                message: 'Suscripción Premium activada correctamente',
                premiumExpiry: expiryDate
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Error en el pago: estado no completado',
                status: capture.result.status
            });
        }
    } catch (error) {
        console.error('Error al capturar pago PayPal:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar el pago',
            error: error.message
        });
    }
};

// Cancelar suscripción
exports.cancelSubscription = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user.isPremium) {
            return res.status(400).json({ message: 'No tienes una suscripción activa' });
        }

        // Si hay una suscripción en PayPal, cancelarla
        if (user.paypalSubscriptionId) {
            // Aquí iría el código para cancelar en PayPal si es necesario
            // Nota: Para pagos únicos, esto no es necesario
        }

        // Actualizar en la base de datos
        // Mantenemos el acceso premium hasta la fecha de expiración
        await User.findByIdAndUpdate(userId, {
            $push: {
                premiumHistory: {
                    action: 'canceled',
                    date: new Date(),
                    details: 'Suscripción Premium cancelada manualmente'
                }
            }
        });

        res.json({
            success: true,
            message: 'Suscripción cancelada. Mantendrás el acceso Premium hasta la fecha de expiración.',
            premiumExpiry: user.premiumExpiry
        });
    } catch (error) {
        console.error('Error al cancelar suscripción:', error);
        res.status(500).json({
            message: 'Error al cancelar suscripción',
            error: error.message
        });
    }
};

// Webhook para eventos de PayPal
exports.handleWebhook = async (req, res) => {
    try {
        const event = req.body;

        // Verificar firma del webhook (importante en producción)
        // ...código de verificación...

        // Manejar diferentes tipos de eventos
        switch (event.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                // Pago recibido
                // ...
                break;

            case 'BILLING.SUBSCRIPTION.CANCELLED':
                // Suscripción cancelada
                // ...
                break;

            // Otros eventos...
        }

        res.status(200).send('Webhook recibido');
    } catch (error) {
        console.error('Error en webhook de PayPal:', error);
        res.status(500).send('Error procesando webhook');
    }
};