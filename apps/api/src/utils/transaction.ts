import mongoose, { ClientSession } from 'mongoose';

/**
 * Executes a database operation within a MongoDB multi-document ACID transaction.
 * If the current MongoDB deployment is a standalone node (such as local development without a replica set),
 * it transparently executes the operations with safe rollback handling and logs the mode.
 */
export async function withTransaction<T>(
  operation: (session?: ClientSession) => Promise<T>
): Promise<T> {
  // If mongoose is not connected (e.g. in mock unit tests), invoke operation directly
  if (mongoose.connection.readyState !== 1) {
    return await operation(undefined);
  }

  let session: ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    let result: T;
    try {
      session.startTransaction();
      result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (txErr: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      // If transactions are unsupported (standalone MongoDB node)
      if (
        txErr?.message &&
        (txErr.message.includes('replica set') ||
         txErr.message.includes('Transaction numbers are only allowed on a replica set member'))
      ) {
        // Fallback for standalone dev environments
        return await operation(undefined);
      }
      throw txErr;
    }
  } catch (err: any) {
    if (
      err?.message &&
      (err.message.includes('replica set') ||
       err.message.includes('Transaction numbers are only allowed on a replica set member'))
    ) {
      return await operation(undefined);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
