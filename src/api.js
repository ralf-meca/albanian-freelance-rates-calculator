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

  const r = data.body[0]
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
