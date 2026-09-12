# Preparación comercial MY3D.PR

Publicado no equivale a preparado para cobrar. Esta versión conserva Stripe test y PayPal sandbox únicamente. No cambiar a claves live sin una implementación y validación específica.

## Correcciones de esta entrega
- Configuración de pagos fail-closed: rechaza placeholders, valida dependencias de checkout y no cachea disponibilidad.
- Interfaz oculta métodos no disponibles; copy sin prometer PayPal, entregas, garantías o newsletter no verificados.
- Contacto fallback del negocio y etiquetas/identificadores estables en formularios administrativos.
- Errores ambiguos del proveedor no afirman que no hubo un cargo.
- Ejemplo de entorno documenta STRIPE_ENVIRONMENT=test.

## Requiere al propietario antes de vender
1. Stripe: confirmar cuenta/negocio, banco y autorización de cobros reales. Rotar cualquier credencial previamente expuesta mediante sus paneles; nunca enviarlas por chat. Configurar claves y webhook live como secretos server-side después de implementar soporte live controlado.
2. Definir destinos, tarifas, umbral gratuito, transportista y flujo de etiquetas/tracking. Confirmar impuestos/IVU con asesor competente; no inferirlos de la ubicación.
3. Confirmar inventario real, precios y costos, licencias comerciales y fotos representativas. Archivar la Pokébola de prueba antes del lanzamiento comercial; no borrar órdenes históricas.
4. Aprobar políticas reales de privacidad, personalización, cancelación, devoluciones y tiempos. Las páginas actuales no constituyen revisión legal.
5. Elegir proveedor de correo transaccional y verificar dominio/remitente; implementar y probar notificaciones de pedido, pago y envío. Declarar RESEND_API_KEY no implementa envío.
6. Configurar alertas y backups en Vercel/Supabase/proveedor; probar restauración, revisar RLS y rotación de secretos.
7. Decidir si PayPal se ofrece; es opcional y no debe anunciarse mientras esté deshabilitado.

## Gate comercial pendiente
- Compra exitosa, rechazo, cancelación, reintento, webhook duplicado, reembolso parcial/total y reserva vencida: comprobar estado en proveedor, pedido e inventario.
- Cron desplegado: verificar ejecuciones reales y liberación/reconciliación; una expresión de cron no prueba ejecución.
- Verificar correos recibidos y flujo de preparación/envío/seguimiento.
- Probar funciones anunciadas (cuenta, formularios, carrito, Build-a-Box), ES/EN, móvil y accesibilidad. Las pruebas administrativas no cubren toda la tienda.
- Revisar secretos, tests completos, TypeScript, lint, build y revisión independiente; verificar commit/deployment y dominio después de publicar.

## Límites
No se autorizaron compras reales, nuevas suscripciones de pago, cambios fiscales ni borrado de cuentas reales. No se afirma 100% de cobertura ni entrega de correo sin evidencia. Las comprobaciones de esta entrega deben informarse separando local, publicado y bloqueado.
