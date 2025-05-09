import ToastNotification from "./Notification";

// Separate signing from execution to follow Sui best practices
export const signTransaction = async ({
  currentAccount,
  tx,
  signTransaction,
}: any) => {
  return await signTransaction.mutateAsync({
    account: currentAccount,
    transaction: tx,
  });
};

// Perform a dry run to check transaction validity
export const dryRunTransaction = async ({
  suiClient,
  bytes,
  signature,
  toast,
}: any) => {
  const dryRunResult = await suiClient.dryRunTransactionBlock({
    transactionBlock: bytes,
    signature,
  });

  const digest = dryRunResult.effects?.transactionDigest;
  
  // Show the dry run toast if toast is provided
  if (toast && digest) {
    toast.info(
      <ToastNotification digest={digest} isDryRun={true} />,
      {
        description: "Transaction prepared"
      }
    );
  }

  return {
    dryRunResult,
    digest,
  };
};

// Execute transaction with options for optimized performance
export const executeTransaction = async ({
  suiClient,
  bytes,
  signature,
  options = { showEffects: true, showEvents: true },
  requestType = "WaitForLocalExecution",
}: any) => {
  return await suiClient.executeTransactionBlock({
    transactionBlock: bytes,
    signature,
    options: {
      ...options,
    },
    requestType,
  });
};

// Combined function for backward compatibility
export const signAndExecute = async ({
  suiClient,
  currentAccount,
  tx,
  signTransaction: signTx,
  options = { showEffects: true },
  toast,
  optimizeLatency = false,
}: any) => {
  // Step 1: Sign the transaction
  const { signature, bytes } = await signTransaction({
    currentAccount,
    tx,
    signTransaction: signTx,
  });

  // Step 2: Perform a dry run
  const { digest: dryRunDigest } = await dryRunTransaction({
    suiClient,
    bytes,
    signature,
    toast,
  });

  // Step 3: Execute the transaction
  // If optimizeLatency is true, don't show effects or events for faster confirmation
  const executionOptions = optimizeLatency 
    ? { showEffects: false, showEvents: false } 
    : { ...options };

  const txResult = await executeTransaction({
    suiClient,
    bytes,
    signature,
    options: executionOptions,
  });

  // Verify that the dry run digest matches the actual transaction digest
  console.log("Dry run digest:", dryRunDigest);
  console.log("Actual digest:", txResult.digest);
  console.log("Digests match:", dryRunDigest === txResult.digest);

  return {
    ...txResult,
    dryRunDigest,
  };
};

// Function to only sign and dry run without executing
export const signAndDryRun = async ({
  suiClient,
  currentAccount,
  tx,
  signTransaction: signTx,
  toast,
}: any) => {
  // Step 1: Sign the transaction
  const { signature, bytes } = await signTransaction({
    currentAccount,
    tx,
    signTransaction: signTx,
  });

  // Step 2: Perform a dry run
  const { dryRunResult, digest } = await dryRunTransaction({
    suiClient,
    bytes,
    signature,
    toast,
  });

  return {
    signature,
    bytes,
    dryRunResult,
    digest,
  };
};

export const handleTxResult = (finalTx: any, toast: any, isDryRun = false) => {
  if (isDryRun) {
    toast.info(
      <ToastNotification digest={finalTx.digest} isDryRun={true} />,
      {
        description: "Transaction prepared"
      }
    );
    return finalTx;
  }

  const status = finalTx.effects?.status?.status;
  if (status !== "success") {
    toast.error(
      <ToastNotification digest={finalTx.digest} />,
      {
        description: `Transaction failed: ${finalTx.effects?.status?.error}`
      }
    );
  } else {
    toast.success(
      <ToastNotification digest={finalTx.digest} />,
      {
        description: "Transaction finalized"
      }
    );
  }
  return finalTx;
};

// Add a utility function to handle dry run results
export const handleDryRunResult = (dryRunResult: any, toast: any) => {
  toast.info(
    <ToastNotification digest={dryRunResult.digest} isDryRun={true} />,
    {
      description: "Transaction preview"
    }
  );
  return dryRunResult;
};