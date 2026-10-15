<script setup>
import { ref, computed, watch } from 'vue'
import { calculateWage, grossFromEmployerCost } from './api.js'

const mode = ref('net_to_gross')
const amount = ref('')
const hasDeclaration = ref(true)
const result = ref(null)
const error = ref('')
const loading = ref(false)

let timer = null
let controller = null

const parsedAmount = computed(() => Number(String(amount.value).replace(/[,\s]/g, '')))

const fmt = (n) => (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

function onInput(e) {
  // keep digits and a single decimal point, show thousands separators
  const raw = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
  const [int, dec] = raw.split('.')
  amount.value = (int ? Number(int).toLocaleString('en-US') : '') + (dec !== undefined ? '.' + dec : '')
}

async function run() {
  clearTimeout(timer)
  controller?.abort()
  error.value = ''

  const wage = parsedAmount.value
  if (!wage || wage <= 0) {
    result.value = null
    loading.value = false
    return
  }

  controller = new AbortController()
  loading.value = true
  try {
    result.value = isDayRate.value
      ? await grossFromEmployerCost((wage * billableDays.value) / 12, hasDeclaration.value, controller.signal)
      : await calculateWage(wage, mode.value, hasDeclaration.value, controller.signal)
  } catch (e) {
    if (e.name !== 'AbortError') {
      error.value = e.message
      result.value = null
    }
  } finally {
    loading.value = false
  }
}

// recalculate as the user types (debounced) and whenever options change
watch(amount, () => {
  clearTimeout(timer)
  timer = setTimeout(run, 400)
})
watch([mode, hasDeclaration], run)

const isDayRate = computed(() => mode.value === 'day_rate')
const showDays = computed(() => billByDay.value || isDayRate.value)
const inputLabel = computed(
  () =>
    ({
      net_to_gross: 'Net amount you want to receive',
      gross_to_net: 'Gross amount',
      day_rate: 'Your day rate',
    })[mode.value],
)

// Day-rate billing: the employer cost covers 12 paid months including leave and
// public holidays, but a freelancer only bills the days actually worked.
const WORKDAYS_PER_YEAR = 260 // 52 weeks × 5 days
const billByDay = ref(false)
const daysOff = ref(20)
const holidays = ref(13)

const offDaysPerYear = computed(() => (Number(daysOff.value) || 0) + (Number(holidays.value) || 0))
const billableDays = computed(() => Math.max(WORKDAYS_PER_YEAR - offDaysPerYear.value, 1))
const dayRate = computed(() =>
  isDayRate.value ? parsedAmount.value : result.value ? (result.value.employerCost * 12) / billableDays.value : 0,
)

// in day-rate mode the billable days change the salary, so recalculate
watch([daysOff, holidays], () => {
  if (!isDayRate.value) return
  clearTimeout(timer)
  timer = setTimeout(run, 400)
})
</script>

<template>
  <main class="wrap">
    <header>
      <h1>Albanian Freelance Rates Calculator</h1>
      <p class="sub">Net ⇄ gross salary in Albania (ALL), with every tax and contribution broken down.</p>
    </header>

    <div class="tabs" role="tablist">
      <button
        v-for="(label, key) in { net_to_gross: 'Net → Gross', gross_to_net: 'Gross → Net', day_rate: 'Day rate → Salary' }"
        :key="key"
        role="tab"
        :aria-selected="mode === key"
        :class="{ active: mode === key }"
        @click="mode = key"
      >
        {{ label }}
      </button>
    </div>

    <label class="field">
      <span>{{ inputLabel }}</span>
      <div class="input">
        <input
          :value="amount"
          @input="onInput"
          inputmode="decimal"
          autocomplete="off"
          ":placeholder="isDayRate ? 'e.g. 8,000' : 'e.g. 100,000'"
          autofocus
        />
        <span class="cur">ALL</span>
      </div>
    </label>

    <label class="check">
      <input type="checkbox" v-model="hasDeclaration" />
      Has filled the personal status declaration
      <small>(unlocks the tax-free allowance; untick if this is a second job)</small>
    </label>

    <label v-if="!isDayRate" class="check switch">
      <input type="checkbox" role="switch" v-model="billByDay" />
      Bill by day
    </label>

    <div v-if="showDays" class="days">
      <label>
        <span>Days off per year</span>
        <input type="number" min="0" max="200" v-model.number="daysOff" />
      </label>
      <label>
        <span>Public holidays per year</span>
        <input type="number" min="0" max="60" v-model.number="holidays" />
      </label>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="result?.lessThanMin" class="warn">
      {{ result.lessThanMinMsg || 'Amount is below the minimum wage.' }}
    </p>

    <section v-if="result" class="result" :class="{ dim: loading }">
      <div class="headline">
        <div>
          <span>Net</span>
          <strong>{{ fmt(result.net) }}</strong>
        </div>
        <div>
          <span>Gross</span>
          <strong>{{ fmt(result.gross) }}</strong>
        </div>
        <div>
          <span>Employer cost</span>
          <strong>{{ fmt(result.employerCost) }}</strong>
        </div>
      </div>

      <div v-if="showDays" class="dayrate">
        <div class="big">
          <span>{{ isDayRate ? 'As an employee' : 'Day rate' }}</span>
          <strong v-if="isDayRate">{{ fmt(result.gross) }} gross · {{ fmt(result.net) }} net</strong>
          <strong v-else>{{ fmt(Math.round(dayRate)) }} ALL</strong>
        </div>
        <ul>
          <li><b>{{ fmt(offDaysPerYear / 12) }}</b> unpaid off days / month</li>
          <li><b>{{ fmt(billableDays) }}</b> billable days / year ({{ fmt(billableDays / 12) }} / month)</li>
          <li v-if="isDayRate">{{ fmt(dayRate) }} × {{ fmt(billableDays) }} ÷ 12 = {{ fmt(Math.round((dayRate * billableDays) / 12)) }} employer cost / month</li>
          <li v-else>{{ fmt(result.employerCost) }} × 12 ÷ {{ fmt(billableDays) }}</li>
        </ul>
      </div>

      <table>
        <thead>
          <tr>
            <th></th>
            <th>Employee</th>
            <th>Employer</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Income tax</th>
            <td>{{ fmt(result.incomeTax) }}</td>
            <td>–</td>
            <td>{{ fmt(result.incomeTax) }}</td>
          </tr>
          <tr>
            <th>Social security</th>
            <td>{{ fmt(result.employeeSocial) }}</td>
            <td>{{ fmt(result.employerSocial) }}</td>
            <td>{{ fmt(result.employeeSocial + result.employerSocial) }}</td>
          </tr>
          <tr>
            <th>Health insurance</th>
            <td>{{ fmt(result.employeeHealth) }}</td>
            <td>{{ fmt(result.employerHealth) }}</td>
            <td>{{ fmt(result.employeeHealth + result.employerHealth) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th>Total</th>
            <td>{{ fmt(result.employeeTotal) }}</td>
            <td>{{ fmt(result.employerTotal) }}</td>
            <td>{{ fmt(result.totalTaxes) }}</td>
          </tr>
        </tfoot>
      </table>
    </section>
    <p v-else-if="loading" class="muted">Calculating…</p>

    <footer>
      Calculations by the
      <a href="https://www.pagaime.net" target="_blank" rel="noopener">pagaime.net</a> service.
      Figures are indicative, not tax advice.
    </footer>
  </main>
</template>
