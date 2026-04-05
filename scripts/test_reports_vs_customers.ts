import { getCustomerTransactions } from "../src/app/(dashboard)/reports/actions";
import { getCustomers } from "../src/app/(dashboard)/customers/actions";

async function test() {
  const customers = await getCustomers();
  const c = customers.find(x => x.name === "محمد السيد");
  console.log(`Customers Page Balance for Mohammad: ${c?.balance}`);

  if (c) {
    const report = await getCustomerTransactions(c.id);
    let run = report.reduce((acc, t) => acc + t.debit - t.credit, 0);
    console.log(`Report Balance for Mohammad: ${run}`);
  }
}
test();
