import { Prisma } from "@prisma/client";

export class SequenceService {
  /**
   * Retrieves the next available number for a given sequence in a concurrency-safe manner.
   * This uses an atomic upsert operation via the provided Prisma transaction client.
   *
   * @param tx The Prisma Transaction Client
   * @param sequenceName The ID of the sequence (e.g. 'JournalEntry', 'SalesInvoice', 'SalesReturn', 'PurchaseInvoice', 'PurchaseReturn')
   * @returns The next sequence number
   */
  static async getNextSequenceValue(tx: Prisma.TransactionClient, sequenceName: string): Promise<number> {
    const sequence = await tx.systemSequence.upsert({
      where: { id: sequenceName },
      update: { lastValue: { increment: 1 } },
      create: { id: sequenceName, lastValue: 1 },
    });

    return sequence.lastValue;
  }
}
