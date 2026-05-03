# Finanzas Personales - Plan Deuda Cero

## Descripción del proyecto
Aplicación web de gestión de finanzas personales con foco en control de dinero, deudas y plan para eliminar deudas (método bola de nieve, avalancha o manual).

**Moneda:** Quetzales (Q)
**Usuario MVP:** 1 usuario (preparado para multiusuario futuro)
**Fecha de inicio:** 03 de mayo de 2026

## Stack tecnológico
- **Frontend:** Angular + TypeScript + Tailwind CSS
- **Backend:** Node.js + NestJS + MongoDB
- **ODM:** Mongoose
- **Gráficas:** Chart.js / ng2-charts
- **Reportes:** ExcelJS (Excel), PDFKit (PDF)
- **Despliegue:** Railway

## Estructura del proyecto
```
finanzas-plus/
├── apps/
│   ├── frontend/          # Aplicación Angular
│   └── backend/           # API NestJS
├── .claude/               # Configuración Claude Code
├── .git/                  # Repositorio Git
├── CLAUDE.md              # Este archivo
└── package.json           # Configuración de workspaces
```

## Reglas importantes
1. **Montos en centavos:** Todo monto se almacena como entero en centavos en BD (ej: Q52.75 = 5275)
2. **Lógica en backend:** Validaciones monetarias criticas en NestJS, no en frontend
3. **Transacciones ACID:** Pagos, transferencias y cierres deben usar transacciones de MongoDB
4. **Auditoria:** Movimientos, cierres y ediciones en meses cerrados deben estar auditados
5. **No guardar datos sensibles:** No guardar números reales de cuenta

## Categorías de gasto iniciales
- Comida
- Golosinas
- Servicios
- Salud
- Deudas
- Entretenimiento
- Familia
- Emergencias

## Datos iniciales del usuario
- **Tarjetas:** G&T (corte 15/10 y corte 3/28)
- **Préstamo Promerica:** Q2,950/mes, 60 cuotas, cuota 23
- **Cooperativa:** Q1,655/mes, ~6 años, capital/interés separados
- **Adelanto Banrural:** ~Q4,800
- **Fondo Banrural:** Q100/mes, 6% anual, vencimiento 29/07/2027

## Principales funcionalidades
- Dashboard con resumen financiero
- Gestión de cuentas, ingresos, gastos
- Control de tarjetas de crédito con cortes y pagos
- Gestión de deudas (múltiples tipos)
- Fondos de retiro con proyección
- Plan Deuda Cero con análisis de métodos
- Cierre mensual con snapshots
- Reportes y gráficas
- Exportación a Excel y PDF

## Criterios de éxito MVP
- ✓ Crear cuentas y registrar saldos
- ✓ Registrar ingresos/gastos/transferencias
- ✓ Disponible total = suma de cuentas
- ✓ Tarjetas con cortes y pagos
- ✓ Deudas de diferentes tipos
- ✓ Cierre mensual y edición
- ✓ Gráfica de evolución de deuda
- ✓ Plan Deuda Cero funcional
- ✓ Exportación a Excel/PDF
- ✓ Responsive (móvil y PC)

## Notas técnicas
- Usar Mongoose para esquemas y validaciones
- MongoDB Schema Validation en colecciones críticas
- Módulos NestJS por dominio: accounts, movements, creditCards, debts, funds, reports, closures
- Transacciones en operaciones que afecten múltiples documentos
- Cálculos de saldos deben poder reconstruirse desde movimientos y snapshots
