// Same calculation service that powers https://www.pagaime.net
const API_URL = 'https://elif12.2rmlab.com/live/api/guestservice.php'

/**
 * @param {number} wage - amount in ALL
 * @param {'net_to_gross'|'gross_to_net'} type
 * @param {boolean} hasDeclaration - "has filled personal status declaration"
 */
export async function calculateWage(wage, type, hasDeclaration = false, signal) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      body: [
        {
          cmd: 'calculatewage',
          wage,
          type,
          has_filled_personal_status_declaration: hasDeclaration,
        },
      ],
    }),
    signal,
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)

  const data = await res.json()
  if (data?.status?.code !== 600 || !data.body?.[0]) {
    throw new Error(data?.status?.message || 'Unexpected response')
  }

  return toResult(data.body[0])
}

/**
 * Finds the gross salary whose total employer cost equals `employerCost`.
 * The API has no such mode and contributions are not a flat rate (employer
 * social security is capped and floored at the minimum wage), so we start at
 * the uncapped rate and correct using the slope observed at each guess.
 */
export async function grossFromEmployerCost(employerCost, hasDeclaration = false, signal) {
  let gross = employerCost / 1.167
  let r
  for (let i = 0; i < 6; i++) {
    r = await calculateWage(Math.round(gross), 'gross_to_net', hasDeclaration, signal)
    const diff = employerCost - r.employerCost
    if (Math.abs(diff) < 1) break
    const socialRate = r.employerSocial / r.gross
    const slope = 1 + r.employerHealth / r.gross + (Math.abs(socialRate - 0.15) < 0.001 ? 0.15 : 0)
    gross += diff / slope
  }
  return r
}

function toResult(r) {
  const employee =
    r.income_tax + r.employee_social_security_contribution + r.employee_health_insurance_contribution
  const employer = r.employer_social_security_contribution + r.employer_health_insurance_contribution

  return {
    net: r.net_wage,
    gross: r.gross_wage,
    incomeTax: r.income_tax,
    employeeSocial: r.employee_social_security_contribution,
    employeeHealth: r.employee_health_insurance_contribution,
    employerSocial: r.employer_social_security_contribution,
    employerHealth: r.employer_health_insurance_contribution,
    employeeTotal: employee,
    employerTotal: employer,
    totalTaxes: employee + employer,
    employerCost: r.gross_wage + employer,
    lessThanMin: r.less_than_min,
    lessThanMinMsg: r.less_than_min_msg,
  }
}
