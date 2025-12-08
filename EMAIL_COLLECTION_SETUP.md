# Configuración de Colección de Emails

Este documento explica cómo conectar la funcionalidad de captura de emails a diferentes servicios para que puedas ver todos los emails capturados.

## Cómo funciona actualmente

- Los usuarios deben ingresar su email antes de usar la app
- El email se guarda en `localStorage` para no pedirlo de nuevo
- El email se envía a través de la función `sendEmailToBackend()` en `EmailAuthContext.tsx`

## Opción 1: Google Sheets (RECOMENDADO para MVP)

### Ventajas
- ✅ Gratis
- ✅ Fácil de configurar
- ✅ Puedes ver todos los emails en una hoja de cálculo
- ✅ Puedes exportar a CSV

### Pasos:

1. **Crea una Google Sheet**
   - Ve a https://sheets.google.com
   - Crea una nueva hoja
   - En la primera fila, pon: `Email | Timestamp`

2. **Crea un Google Apps Script**
   - En tu Google Sheet, ve a: `Extensiones > Apps Script`
   - Borra el código que viene por defecto
   - Pega este código:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.email,
    data.timestamp
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. **Despliega el script**
   - Click en `Implementar > Nueva implementación`
   - Selecciona tipo: `Aplicación web`
   - En "Ejecutar como": Selecciona tu cuenta
   - En "Quién tiene acceso": Selecciona `Cualquier persona`
   - Click en `Implementar`
   - **COPIA LA URL** que te da (termina en `/exec`)

4. **Conecta con tu app**
   - Abre `src/contexts/EmailAuthContext.tsx`
   - En la función `sendEmailToBackend`, descomenta y actualiza:

```typescript
await fetch('TU_URL_DE_GOOGLE_APPS_SCRIPT_AQUI', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email,
        timestamp: new Date().toISOString()
    })
})
```

## Opción 2: Formspree (Más Simple)

### Ventajas
- ✅ Super simple (2 minutos)
- ✅ Recibes los emails en tu correo
- ✅ Gratis hasta 50 submissions/mes

### Pasos:

1. Ve a https://formspree.io/
2. Crea una cuenta gratuita
3. Crea un nuevo form
4. Copia tu Form ID (aparece como `https://formspree.io/f/YOUR_FORM_ID`)
5. En `src/contexts/EmailAuthContext.tsx`, descomenta y actualiza:

```typescript
await fetch('https://formspree.io/f/TU_FORM_ID', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
})
```

## Opción 3: Tu propio backend

Si tienes un backend propio, simplemente actualiza la función `sendEmailToBackend` con tu endpoint.

## Para testing local

Durante desarrollo, los emails se imprimen en la consola del navegador:
```
Email captured: usuario@email.com
```

## Ver emails capturados

- **Google Sheets**: Abre tu hoja de cálculo
- **Formspree**: Revisa tu email
- **localStorage**: Abre DevTools > Application > Local Storage

---

**Nota**: El email se guarda en localStorage antes de intentar enviarlo al backend, así que aunque falle el envío, el usuario puede usar la app.
