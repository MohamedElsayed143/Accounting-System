import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const updated = await prisma.account.updateMany({
        where: {
            OR: [
                { treasurySafe: { isNot: null } },
                { treasuryBank: { isNot: null } }
            ]
        },
        data: {
            isTerminal: true
        }
    });
    console.log('Fixed', updated.count, 'accounts');
}

main().catch(console.error).finally(() => prisma.$disconnect());
