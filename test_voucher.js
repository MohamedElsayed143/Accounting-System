const { createPaymentVoucher } = require('./src/app/(dashboard)/treasury/payment-voucher/actions');

async function test() {
  try {
    const res = await createPaymentVoucher({
      voucherNumber: "PV-TEST-1",
      date: new Date().toISOString(),
      amount: 10,
      accountType: "safe",
      accountId: 1, // Change this to a valid safe ID
      supplierId: 1, // Change this to a valid supplier ID
      description: "Test run from script"
    });
    console.log(res);
  } catch(e) {
    console.error(e);
  }
}
test();
