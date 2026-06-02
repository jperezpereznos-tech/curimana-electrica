# ⚡ Algoritmo de Cálculo y Facturación — Curimana Eléctrica

El núcleo del sistema de facturación eléctrica de Curimana se basa en un **esquema tarifario progresivo por tramos (escalonado)**. Esto significa que el consumo total del cliente se divide en rangos, y cada porción de consumo se cobra al precio asignado para ese tramo en particular, en lugar de facturar todo el consumo a una sola tasa plana.

---

## 📐 Algoritmo de Cálculo de Energía Eléctrica

El cálculo se define en PostgreSQL mediante la función `calculate_energy_amount` y en el cliente en `src/lib/billing-utils.ts`. 

### Reglas Críticas del Algoritmo
1. **Límite inferior exclusivo**: El campo `min_kwh` es un límite inferior exclusivo.
2. **Contigüidad de tramos**: No debe haber vacíos entre tramos. El límite superior del tramo $N$ debe ser igual al límite inferior del tramo $N+1$.
3. **Último tramo abierto**: El último tramo debe tener `max_kwh` en `NULL` para acumular todo el consumo excedente.

### 📝 Algoritmo en Pseudocódigo
```
inicializar total = 0
ordenar tramos por min_kwh ascendente

para cada tramo:
  si consumo_total <= tramo.min_kwh
    continuar al siguiente tramo (el consumo no entra en este tramo)

  si tramo.max_kwh es NULL
    consumo_en_tramo = consumo_total - tramo.min_kwh
  sino
    consumo_en_tramo = min(consumo_total, tramo.max_kwh) - tramo.min_kwh

  total = total + (consumo_en_tramo * tramo.price_per_kwh)

retornar redondear(total, 2)
```

---

## 📊 Ejemplos Matemáticos (Tarifa Monofásica BT5B)

La tarifa monofásica de Curimana tiene los siguientes tramos configurados y validados:
- **Tramo 1**: 0 a 30 kWh ➔ **S/ 0.31** por kWh
- **Tramo 2**: 30 a 100 kWh ➔ **S/ 0.62** por kWh
- **Tramo 3**: 100+ kWh ➔ **S/ 0.64** por kWh

A continuación se detalla la matemática paso a paso para diferentes niveles de consumo:

### Caso 1: Consumo de 30 kWh (Solo entra en Tramo 1)
- **Tramo 1 (0-30)**: Entra todo el consumo (30 kWh) ➔ $30 \times 0.31 = S/ 9.30$
- **Tramo 2 (30-100)**: Consumo (30) es $\le$ límite inferior (30) ➔ S/ 0.00
- **Tramo 3 (100+)**: Consumo (30) es $\le$ límite inferior (100) ➔ S/ 0.00
- **Importe de Energía**: **S/ 9.30**

### Caso 2: Consumo de 31 kWh (Cruza al Tramo 2)
- **Tramo 1 (0-30)**: Se llena el tramo (30 kWh) ➔ $30 \times 0.31 = S/ 9.30$
- **Tramo 2 (30-100)**: Entra el excedente ($31 - 30 = 1 \text{ kWh}$) ➔ $1 \times 0.62 = S/ 0.62$
- **Tramo 3 (100+)**: Consumo (31) es $\le$ límite inferior (100) ➔ S/ 0.00
- **Importe de Energía**: $9.30 + 0.62 =$ **S/ 9.92**

### Caso 3: Consumo de 50 kWh (Consumo típico)
- **Tramo 1 (0-30)**: Se llena el tramo (30 kWh) ➔ $30 \times 0.31 = S/ 9.30$
- **Tramo 2 (30-100)**: Entra el excedente ($50 - 30 = 20 \text{ kWh}$) ➔ $20 \times 0.62 = S/ 12.40$
- **Importe de Energía**: $9.30 + 12.40 =$ **S/ 21.70**

### Caso 4: Consumo de 100 kWh (Límite del Tramo 2)
- **Tramo 1 (0-30)**: Se llena el tramo (30 kWh) ➔ $30 \times 0.31 = S/ 9.30$
- **Tramo 2 (30-100)**: Se llena el tramo ($100 - 30 = 70 \text{ kWh}$) ➔ $70 \times 0.62 = S/ 43.40$
- **Tramo 3 (100+)**: Consumo (100) es $\le$ límite inferior (100) ➔ S/ 0.00
- **Importe de Energía**: $9.30 + 43.40 =$ **S/ 52.70**

### Caso 5: Consumo de 150 kWh (Entra al Tramo 3)
- **Tramo 1 (0-30)**: Se llena el tramo (30 kWh) ➔ $30 \times 0.31 = S/ 9.30$
- **Tramo 2 (30-100)**: Se llena el tramo ($100 - 30 = 70 \text{ kWh}$) ➔ $70 \times 0.62 = S/ 43.40$
- **Tramo 3 (100+)**: Entra el excedente ($150 - 100 = 50 \text{ kWh}$) ➔ $50 \times 0.64 = S/ 32.00$
- **Importe de Energía**: $9.30 + 43.40 + 32.00 =$ **S/ 84.70**

---

## 📋 Estructura y Fórmulas del Recibo

La facturación mensual de un recibo se compone del importe base de energía más una serie de conceptos fijos y variables.

### Fórmula de Liquidación

$$
\text{Cargos Fijos} = \sum (\text{Conceptos de tipo 'fixed'} + \text{Conceptos de tipo 'per\_kwh'} \times \text{Consumo}) + \sum (\text{Conceptos de tipo 'percentage'} \times \text{Base})
$$

$$
\text{Subtotal} = \text{Importe Energía} + \text{Cargos Fijos}
$$

$$
\text{Total Recibo} = \text{Subtotal} + \text{Deuda Anterior}
$$

### Los Dos Pasos de Cálculo de Conceptos
Al liquidar conceptos adicionales (como Cargo Fijo, Mantenimiento, Alumbrado Público, IGV, etc.), se aplican en dos pasadas consecutivas para asegurar que los conceptos de tipo porcentaje se apliquen sobre la base correcta:

- **Pasada 1**: Se calculan todos los conceptos de tipo **`fixed`** (montos constantes como Cargo Fijo) y **`per_kwh`** (monto unitario multiplicado por el consumo de energía).
- **Pasada 2**: Se calculan los conceptos de tipo **`percentage`** (porcentaje aplicado sobre la base constituida por el *Importe de Energía* + *Suma de conceptos de la pasada 1*).

### ⚠️ Sutileza Técnica en Lógica de Porcentajes
Existe una sutil diferencia de comportamiento en el cálculo de múltiples conceptos de porcentaje:
- **Cierre del periodo** (`period-service.ts`): Calcula todos los conceptos porcentuales de forma independiente basándose en la *misma base fija* obtenida tras la Pasada 1.
- **Simulador de desglose** (`receipt-service.ts`): Utiliza una acumulación cascada (cada concepto porcentual incrementa el subtotal acumulado y el siguiente concepto porcentual se aplica sobre este nuevo total).
- *Nota operativa*: Actualmente ambos producen el mismo resultado debido a que solo existe un concepto porcentual configurado en el sistema (IGV, actualmente inactivo o a tasa 0%). En caso de activar múltiples conceptos porcentuales en el futuro, debe unificarse este comportamiento.
