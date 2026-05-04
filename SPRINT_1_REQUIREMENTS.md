# SPRINT 1 - Requerimientos Exactos a Seguir

## Scope
- RF-01: Dashboard principal (resumen)
- RF-02: Cuentas individuales (CRUD)
- RF-03: Ingresos manuales
- RF-04: Gastos manuales
- RF-05: Categorías de gasto
- RF-06: Registro rápido
- RF-07: Transferencias propias
- RF-08: Ajustes de saldo

## Modelos de Datos Exactos

### User
```
- userId: ObjectId
- name: string (requerido)
- email: string (requerido, único)
- currency: "Q" (default)
- timezone: "America/Guatemala" (default)
- settings: Object
- createdAt, updatedAt
```

### Account (RB-01, RB-05, RB-06)
```
- userId: ObjectId (requerido, referencia a User)
- alias: string (requerido) - ej: "Banrural sueldo"
- institution: string - ej: "Banrural"
- type: enum [checking, savings, cash, credit_union] (default: checking)
- currentBalanceCents: number (entero en centavos, requerido, default: 0)
- initialBalanceCents: number (entero en centavos, requerido, default: 0)
- isActive: boolean (default: true)
- createdAt, updatedAt
```

### Category
```
- userId: ObjectId (requerido)
- name: string (requerido)
- type: "expense" | "income"
- isDefault: boolean
- isActive: boolean (default: true)
- createdAt, updatedAt
```

**Categorías iniciales (8):**
Comida, Golosinas, Servicios, Salud, Deudas, Entretenimiento, Familia, Emergencias

### Movement (RB-05, RB-06, RB-07, RB-18, RB-19)
```
- userId: ObjectId (requerido)
- type: "income" | "expense" | "transfer" | "adjustment"
- amountCents: number (entero en centavos, requerido)
- date: Date (requerido)
- accountId: ObjectId (cuenta origen/destino)
- categoryId: ObjectId (si aplica)
- paymentMethod: "cash" | "debit" | "transfer" | "adjustment"
- note: string (opcional)
- status: "pending" | "completed" (default: completed)
- relatedEntityId: ObjectId (para transferencias/ajustes)
- createdAt, updatedAt
```

## Reglas de Negocio Exactas

### RB-01: Disponible Total
```
disponibleTotal = SUM(account.currentBalanceCents for account in user.accounts where isActive=true)
```
**Nota:** No incluye fondos bloqueados (para Sprint 3)

### RB-05: Ingreso a Cuenta
- Cuando se registra ingreso: `account.currentBalanceCents += amountCents`
- Debe registrarse como Movement con type="income"
- Aparece en reporte del mes de la fecha del ingreso

### RB-06: Gasto con Efectivo/Débito
- Reduce saldo de cuenta origen: `account.currentBalanceCents -= amountCents`
- Registrado como Movement con type="expense"
- paymentMethod: "cash" | "debit"

### RB-07: Gasto con Tarjeta (SOLO LÓGICA)
- **En Sprint 1:** Solo documentar que NO reduce disponible
- El consumo se manejará en Nivel 2 (RF-09, RF-10)

### RB-08: Transferencia Propia (RB-07)
- Afecta: account origen (decremento) + account destino (incremento)
- type="transfer", paymentMethod="transfer"
- NO se registra como gasto ni ingreso
- Operación ACID (transacción MongoDB)

### RB-18: Montos en Centavos
- Q52.75 se almacena como 5275 (entero)
- Frontend muestra: "Q52.75"
- Backend siempre enteros

### RB-19: Transacciones ACID
- Transferencias entre cuentas: usar transacción MongoDB
- Si falla una parte, revertir todo

## API Endpoints Requeridos

### Authentication
- POST /auth/login (userId básico para MVP)
- POST /auth/register (crear usuario)

### Accounts
- POST /accounts (crear)
- GET /accounts (listar del usuario)
- GET /accounts/:id (obtener uno)
- PUT /accounts/:id (editar)
- GET /accounts/total (saldo total disponible)

### Movements
- POST /movements (crear)
- GET /movements (listar con filtros)
- GET /movements/summary (resumen por mes)
- PUT /movements/:id (editar si no es cierre mensual)
- GET /movements/available-total (disponible total)

### Categories
- GET /categories (listar)
- POST /categories (crear nueva)
- PUT /categories/:id (editar)

### Dashboard
- GET /dashboard (resumen: disponible total, deudas, patrimonio, próximos pagos)

## Frontend Screens Requeridas

### Login
- Email + userId (básico MVP)
- JWT token guardado en localStorage

### Dashboard
- Card 1: Disponible Total (suma de cuentas)
- Card 2: Ahorro Bloqueado (0 en Sprint 1)
- Card 3: Total Deudas (0 en Sprint 1)
- Card 4: Patrimonio (disponible - deudas)
- Tabla: Últimos 10 movimientos
- Nota: Gráfica de evolución de deuda para Sprint 3

### Cuentas
- Tabla: Lista de cuentas con saldo actual
- Botón: Crear cuenta
- Botón: Editar cuenta
- Mostrar: disponible total en header

### Movimientos
- Tabla: Ingresos, gastos, transferencias, ajustes
- Filtros: Mes, cuenta, categoría, tipo
- Botón: Registrar movimiento
- Registro rápido (Mobile): Monto + Categoría + Cuenta (fecha automática)

### Registro Rápido (Mobile)
- Input: Monto
- Select: Categoría
- Select: Cuenta/Medio de pago
- Botón: Guardar
- Fecha: Automática (hoy)

## Validaciones

### Backend (Críticas)
- amountCents > 0
- currentBalanceCents nunca < 0 (validar antes de restar)
- Toda operación monetaria debe pasar por backend
- Transacción ACID para transferencias

### Frontend
- Validaciones de formularios
- Mostrar saldos con 2 decimales
- Convertir Q x.xx <-> centavos

## Testing
- Crear cuenta y verificar aparece en total disponible
- Registrar ingreso y verificar se suma al saldo
- Registrar gasto y verificar se resta del saldo
- Transferencia entre cuentas: verificar origen y destino
- Ajuste de saldo: verificar recalcula total
