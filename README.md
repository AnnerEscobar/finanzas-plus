# Finanzas Personales - Plan Deuda Cero

Aplicación web para gestionar finanzas personales con enfoque en control de deudas y plan para eliminarlas.

## Características principales

- 💰 Control de dinero disponible por cuenta
- 💳 Gestión de tarjetas de crédito con cortes automáticos
- 📊 Control de múltiples tipos de deudas
- 📈 Gráficas de evolución de deuda e ingresos vs gastos
- 🎯 Plan Deuda Cero (métodos bola de nieve, avalancha, manual)
- 📱 Diseño responsive (móvil y PC)
- 📄 Exportación a Excel y PDF
- 📅 Cierres mensuales con snapshots

## Requisitos previos

- Node.js 18+
- npm 9+ o yarn
- MongoDB (local o en Railway)

## Instalación

```bash
# Clonar proyecto
git clone <repo-url>
cd finanzas-plus

# Instalar dependencias
npm install

# Crear archivos .env en apps/frontend y apps/backend
cp apps/backend/.env.example apps/backend/.env.local
cp apps/frontend/.env.example apps/frontend/.env.local
```

## Desarrollo

```bash
# Ejecutar frontend y backend en paralelo
npm run dev

# O ejecutar por separado:
npm run dev --workspace=apps/frontend
npm run dev --workspace=apps/backend
```

## Construcción

```bash
npm run build
```

## Despliegue

El proyecto está configurado para Railway. Ver documentación en `apps/frontend` y `apps/backend`.

## Stack tecnológico

- **Frontend:** Angular + TypeScript + Tailwind CSS + Chart.js
- **Backend:** Node.js + NestJS + MongoDB + Mongoose
- **Gráficas:** ng2-charts
- **Reportes:** ExcelJS, PDFKit

## Documentación

Ver [CLAUDE.md](./CLAUDE.md) para especificaciones técnicas y reglas de negocio.

## Status

MVP en desarrollo - Versión 1.0
