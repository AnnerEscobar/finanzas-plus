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

## Modelo de Tarjetas de Crédito y Compras (Sprint 5)

### Ciclo del corte de tarjeta
Cada tarjeta tiene 2 fechas configurables:
- **`cutoffDay`**: día del mes en que cierra el corte (ej: 15)
- **`paymentDueDay`**: día del mes en que vence el pago (ej: 10)

**Ejemplo G&T (cutoff 15, vencimiento 10):**
- Período de gastos: 16 mayo → 15 junio
- Corte: 15 junio a medianoche
- Vencimiento de pago: 10 julio (~25 días después del cierre)

Cálculo automático del `paymentDueDate`:
- Si `paymentDueDay > cutoffDay`: paga el mismo mes del corte
- Si `paymentDueDay < cutoffDay`: paga el mes siguiente al corte

### Estados del corte
- **`open`**: corte activo, recibiendo cargos del período actual
- **`closed_unpaid`**: corte cerrado (pasó el cutoffDay), pendiente de pago
- **`paid`**: corte pagado completamente (los gastos cuentan como ejecutados)

### Modelo de "Gasto" (cash basis)
**Importante:** Una compra con tarjeta NO es gasto inmediato. El gasto se ejecuta cuando se PAGA el corte de tarjeta.

**Caso 1 - Compra de un solo pago:**
1. Compra Q500 con tarjeta G&T → cargo en corte actual (NO sale dinero)
2. Llega vencimiento del corte → pagás Q500 desde cuenta Banrural
3. AHORA SÍ es gasto real Q500 en su categoría (Comida, etc.)

**Caso 2 - Compra a cuotas (Extrafinanciamiento):**
1. Compra Q12,000 a 12 cuotas → crea ExtraFinanciamiento (NO sale dinero)
2. Cada mes, al cerrar el corte, se agrega automáticamente Cuota X/12 = Q1,000 como cargo
3. Cuando se paga ese corte → Q1,000 sale de cuenta, gasto real Q1,000 categorizado

### Schema CreditCard - cambios requeridos
- `cutoffDay: number` (configurable)
- `paymentDueDay: number` (configurable)
- `extraFinancings: ExtraFinanciamiento[]`

### Subdocumento `Charge` - cambios requeridos
- `categoryId` ahora es **obligatorio**
- `extraFinancingId?: ObjectId` (opcional, si es cuota de un extrafinanciamiento)
- `installmentNumber?: number` (número de cuota: 1, 2, ..., N)

### Subdocumento `CreditCardCorte` - cambios requeridos
- `paymentDueDate: Date` (fecha calculada de vencimiento)
- `paidAt?: Date` (cuándo se pagó)
- `paidFromAccountId?: ObjectId` (de qué cuenta se pagó)
- `status` enum: `'open' | 'closed_unpaid' | 'paid'`

### Subdocumento `ExtraFinanciamiento` (nuevo)
```ts
{
  _id: ObjectId
  description: string         // "iPhone 15"
  totalAmountCents: number    // 1200000 (Q12,000)
  totalInstallments: number   // 12
  paidInstallments: number    // 0..N
  monthlyAmountCents: number  // 100000 (Q1,000)
  startDate: Date
  categoryId: ObjectId        // categoría del gasto (Tecnología)
  status: 'active' | 'completed'
  note?: string
  createdAt: Date
}
```

### Reglas de negocio
1. Al **crear cargo** o **extrafinanciamiento**: requiere `categoryId`
2. Al **cerrar corte** (manual o automático): aplica una cuota de cada extrafinanciamiento activo al nuevo corte
3. Al **pagar corte completo**:
   - Descuenta total del corte de la cuenta seleccionada
   - Genera UN movimiento de gasto por cada categoría única en los cargos del corte
   - Marca corte como `paid`
   - Incrementa `paidInstallments` en cada extrafinanciamiento que tenía cuota en ese corte
4. **Reportes "Gastos por categoría del mes"** = gastos directos del mes + gastos de cortes pagados en el mes
5. **Pago parcial al corte cerrado**: reduce saldo pero el corte sigue `closed_unpaid` hasta pago total
