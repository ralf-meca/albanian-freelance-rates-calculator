# Albanian Freelance Rates Calculator

Vue 3 + Vite app that converts salaries in Albania (ALL) between **net and gross**, showing every tax and contribution:

- **Net → Gross** – enter the net amount you want to take home; the app adds income tax, social security and health insurance to get the gross.
- **Gross → Net** – enter a gross amount; the app deducts all taxes to give the final net.

Results update as you type. Calculations use the same public service that powers [pagaime.net](https://www.pagaime.net) (`net-to-gross` / `gross-to-net`).

## Run

```bash
npm install
npm run dev
```

Build for production with `npm run build`.



> Figures are indicative and not tax advice.
