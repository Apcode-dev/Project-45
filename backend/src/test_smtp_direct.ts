import nodemailer from "nodemailer";

async function testConfigurations() {
  const user = "ap.code.in@gmail.com";
  const passWithSpaces = "umra mqoc sfrd fjub";
  const passClean = "umramqocsfrdfjub";

  console.log("--- TEST 1: service: 'gmail', clean pass ---");
  try {
    const t1 = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: passClean },
    });
    const info1 = await t1.sendMail({
      from: `"Medical Inventory System" <${user}>`,
      to: user,
      subject: "🏥 Direct Gmail Test 1 (service: gmail)",
      text: "Testing direct Gmail delivery via nodemailer service: gmail",
    });
    console.log("SUCCESS TEST 1! Message ID:", info1.messageId);
    return;
  } catch (err: any) {
    console.error("FAILED TEST 1:", err.message);
  }

  console.log("\n--- TEST 2: host: 'smtp.gmail.com', port: 465, secure: true ---");
  try {
    const t2 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass: passClean },
    });
    const info2 = await t2.sendMail({
      from: `"Medical Inventory System" <${user}>`,
      to: user,
      subject: "🏥 Direct Gmail Test 2 (port 465)",
      text: "Testing direct Gmail delivery via port 465 SSL",
    });
    console.log("SUCCESS TEST 2! Message ID:", info2.messageId);
    return;
  } catch (err: any) {
    console.error("FAILED TEST 2:", err.message);
  }

  console.log("\n--- TEST 3: service: 'gmail', pass with spaces ---");
  try {
    const t3 = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: passWithSpaces },
    });
    const info3 = await t3.sendMail({
      from: `"Medical Inventory System" <${user}>`,
      to: user,
      subject: "🏥 Direct Gmail Test 3 (pass with spaces)",
      text: "Testing direct Gmail delivery via pass with spaces",
    });
    console.log("SUCCESS TEST 3! Message ID:", info3.messageId);
    return;
  } catch (err: any) {
    console.error("FAILED TEST 3:", err.message);
  }
}

testConfigurations();
