import { prisma } from '../prisma';
import { Intent } from '@account.tech/core';

/**
 * Service for handling payment-related database operations
 */
export const PaymentService = {
  /**
   * Saves a completed payment to the database
   * 
   * @param data Payment data to save
   * @returns The saved payment record
   */
  async saveCompletedPayment({
    paymentId,
    paidAmount,
    tipAmount,
    issuedBy,
    paidBy,
    coinType,
    description,
    transactionHash,
    creationTime,
  }: {
    paymentId: string;
    paidAmount: string | bigint;
    tipAmount: string | bigint;
    issuedBy: string;
    paidBy: string;
    coinType: string;
    description?: string;
    transactionHash: string;
    creationTime?: number | string;
  }) {
    try {
      console.log("PaymentService: Attempting to save payment", { paymentId, paidBy });
      
      // Check if prisma client is initialized
      if (!prisma || typeof prisma.completedPayment === 'undefined') {
        console.error("PaymentService: Prisma client not properly initialized");
        throw new Error("Prisma client not properly initialized");
      }
      
      // Format USDC amount (divide by 1,000,000)
      let formattedPaidAmount = paidAmount.toString();
      let formattedTipAmount = tipAmount.toString();
      
      if (coinType.includes('::usdc::USDC')) {
        try {
          // Convert to number before division to ensure proper decimal representation
          formattedPaidAmount = (Number(paidAmount.toString()) / 1000000).toString();
          formattedTipAmount = (Number(tipAmount.toString()) / 1000000).toString();
        } catch (e) {
          console.warn("PaymentService: Failed to format USDC amount", e);
        }
      }
      
      // Create a Date object from creationTime if provided
      let createdAt = undefined;
      if (creationTime) {
        try {
          createdAt = new Date(Number(creationTime));
          // Validate the date is valid
          if (isNaN(createdAt.getTime())) {
            console.warn("PaymentService: Invalid creationTime, falling back to default", creationTime);
            createdAt = undefined;
          }
        } catch (e) {
          console.warn("PaymentService: Error parsing creationTime, falling back to default", e);
        }
      }
      
      // Normalize values to ensure they are stored as strings
      const normalizedData = {
        paymentId,
        paidAmount: formattedPaidAmount,
        tipAmount: formattedTipAmount,
        issuedBy,
        paidBy,
        coinType,
        description: description || '', // Ensure description is never null
        transactionHash,
        ...(createdAt && { createdAt }), // Only include if valid date
      };
      
      console.log("PaymentService: Normalized data:", normalizedData);

      // Create or update the record
      console.log("PaymentService: Calling prisma.completedPayment.upsert");
      const result = await prisma.completedPayment.upsert({
        where: { paymentId },
        update: normalizedData, 
        create: normalizedData,
      });
      
      console.log("PaymentService: Payment saved successfully:", result);
      return result;
    } catch (error) {
      console.error('PaymentService: Error saving completed payment:', error);
      throw new Error('Failed to save payment record: ' + (error instanceof Error ? error.message : String(error)));
    }
  },

  /**
   * Gets a completed payment by its original payment ID
   * 
   * @param paymentId The original payment intent ID
   * @returns The completed payment record or null if not found
   */
  async getCompletedPayment(paymentId: string) {
    try {
      return await prisma.completedPayment.findUnique({
        where: { paymentId },
      });
    } catch (error) {
      console.error('Error fetching completed payment:', error);
      return null;
    }
  },

  /**
   * Gets all completed payments for a specific wallet address (either as issuer or payer)
   * 
   * @param walletAddress The wallet address to get payments for
   * @param role Optional - filter by role ('payer' or 'issuer')
   * @returns Array of completed payment records
   */
  async getCompletedPaymentsByAddress(walletAddress: string, role?: 'payer' | 'issuer') {
    try {
      const where = role === 'payer' 
        ? { paidBy: walletAddress }
        : role === 'issuer'
          ? { issuedBy: walletAddress }
          : { 
              OR: [
                { paidBy: walletAddress },
                { issuedBy: walletAddress }
              ]
            };

      return await prisma.completedPayment.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching completed payments by address:', error);
      return [];
    }
  },
}; 