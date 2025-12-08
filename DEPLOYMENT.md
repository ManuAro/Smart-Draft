# Guía de Deployment a Vercel

## Pre-requisitos
- Cuenta de Vercel
- Repositorio Git (GitHub, GitLab, o Bitbucket)
- API Key de OpenAI

## Pasos para Deploy

### 1. Preparar el Repositorio

Asegúrate de que el `.env` **NO** esté en el repositorio (ya está en `.gitignore`).

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### 2. Crear Proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Click en "New Project"
3. Importa tu repositorio de Git
4. Vercel detectará automáticamente que es un proyecto Vite

### 3. Configurar Variables de Entorno

**MUY IMPORTANTE**: En la configuración del proyecto en Vercel, agrega la siguiente variable de entorno:

- **Key**: `OPENAI_API_KEY`
- **Value**: Tu API key de OpenAI (sk-proj-...)
- **Environments**: Marca Production, Preview, y Development

**NOTA**: NO uses el prefijo `VITE_` - la API key debe ser secreta del servidor.

### 4. Deploy

Click en "Deploy" y espera a que termine el build.

### 5. Verificación Post-Deploy

Una vez deployado, verifica que:

1. ✅ El email gate funcione correctamente
2. ✅ Puedas crear y guardar ejercicios (local storage)
3. ✅ La IA funcione (análisis de canvas, generación de soluciones, chat)
4. ✅ Las expresiones matemáticas se rendericen en LaTeX
5. ✅ Los emails se guarden en Google Sheets

### 6. Troubleshooting

**Si la IA no funciona:**
- Verifica que la variable `OPENAI_API_KEY` esté configurada en Vercel
- Chequea los logs de las funciones serverless en el dashboard de Vercel
- Asegúrate de que la API key sea válida y tenga créditos

**Si hay errores 404 en las rutas:**
- Vercel debería manejar las rutas automáticamente con `vercel.json`
- Si hay problemas, verifica que `vercel.json` esté en el root del proyecto

**Si el build falla:**
- Revisa los logs en Vercel
- Ejecuta `npm run build` localmente para reproducir el error

## Arquitectura de Seguridad

La aplicación usa **Vercel Serverless Functions** para proteger la API key:

- Frontend (`/src`) → Llama a `/api/*`
- Serverless Functions (`/api/*`) → Llaman a OpenAI con la API key secreta
- La API key nunca se expone al navegador

## Archivos Importantes

- `/api/analyze.ts` - Análisis de canvas
- `/api/generate-solution.ts` - Generación de soluciones
- `/api/chat.ts` - Chat con la IA
- `vercel.json` - Configuración de rutas
- `.env` - **SOLO para desarrollo local** (nunca hacer commit)

## Google Sheets Integration

El email gate ya está configurado para enviar a:
```
https://script.google.com/macros/s/AKfycby29Q4qMVp4fkb_-aZ5liSLNqO3ipoPyjRAP7m4GiGerFjftWw04HwATIKC8KTs7PBP/exec
```

No se requiere configuración adicional.

## Comandos Útiles

```bash
# Build local (verificar antes de deploy)
npm run build

# Preview del build
npm run preview

# Deploy manual (si no usas Git integration)
vercel --prod
```

## Costos

- **Vercel**: Plan Hobby (gratis) incluye:
  - 100GB bandwidth
  - Serverless Functions
  - Dominios personalizados

- **OpenAI**: Pay-as-you-go según uso de GPT-4o-mini

## Próximos Pasos (Opcional)

- [ ] Agregar dominio personalizado en Vercel
- [ ] Configurar analytics (Vercel Analytics)
- [ ] Implementar rate limiting en las funciones serverless
- [ ] Agregar monitoreo de errores (Sentry)
