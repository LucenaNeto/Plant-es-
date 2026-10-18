/**
 * Cria ou apaga uma conta descartável para inspecionar a interface no
 * localhost.
 *
 * **Escreve no banco**, só nos registros que ele mesmo cria. A senha é gerada
 * na hora e impressa uma vez — ela não vale nada depois do `--apagar`, e a
 * conta existe por minutos.
 *
 *   npx tsx scripts/verificar/conta-descartavel.mts
 *   npx tsx scripts/verificar/conta-descartavel.mts --apagar
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/db/prisma.js";
import { toDateInputValue, todayAsCalendarDate } from "../../lib/dates/calendar-date.js";

const EMAIL = "inspecao-de-interface@descartavel.invalid";
const apagar = process.argv.includes("--apagar");

try {
  if (apagar) {
    const user = await prisma.user.findUnique({
      select: { id: true },
      where: { email: EMAIL },
    });

    if (!user) {
      console.log("Nada a apagar: a conta não existe.");
    } else {
      await prisma.expense.deleteMany({ where: { userId: user.id } });
      await prisma.shift.deleteMany({ where: { userId: user.id } });
      await prisma.recurringRule.deleteMany({ where: { userId: user.id } });
      await prisma.unit.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });

      const sobrou = await prisma.user.count({ where: { email: EMAIL } });
      console.log(
        sobrou === 0
          ? "Conta apagada e limpeza confirmada."
          : "ATENÇÃO: a conta continua no banco.",
      );
    }
  } else {
    await prisma.user.deleteMany({ where: { email: EMAIL } });

    const senha = randomBytes(12).toString("base64url");

    const user = await prisma.user.create({
      data: {
        email: EMAIL,
        name: "Inspeção de interface",
        passwordHash: await bcrypt.hash(senha, 10),
        profession: "medico",
      },
    });

    await prisma.unit.create({
      data: {
        city: "Teste",
        defaultShiftHours: 24,
        defaultShiftValue: 1800,
        name: "Unidade de inspeção",
        type: "hospital",
        userId: user.id,
      },
    });

    console.log(`e-mail: ${EMAIL}`);
    console.log(`senha:  ${senha}`);
    console.log("\nApague com: npx tsx scripts/verificar/conta-descartavel.mts --apagar");
    console.log(`hoje é ${toDateInputValue(todayAsCalendarDate())}`);
  }
} finally {
  await prisma.$disconnect();
}
