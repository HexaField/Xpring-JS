import { AccountInfo } from "../terram/generated/account_info_pb";
import { NetworkClient } from "./network-client";
import GRPCNetworkClient from "./grpc-network-client";
import { GetAccountInfoRequest } from "../terram/generated/get_account_info_request_pb";
import Wallet from "../terram/src/wallet";
import Signer from "../terram/src/signer";
import { Payment } from "../terram/generated/payment_pb";
import { Transaction } from "../terram/generated/transaction_pb";
import { XRPAmount } from "../terram/generated/xrp_amount_pb";
import { GetFeeRequest } from "../terram/generated/get_fee_request_pb";
import { SubmitSignedTransactionResponse } from "../terram/generated/submit_signed_transaction_response_pb";
import { SubmitSignedTransactionRequest } from "../terram/generated/submit_signed_transaction_request_pb";

/**
 * The default network client to use.
 */
const defaultNetworkClient = new GRPCNetworkClient();

/**
 * Error messages from XpringClient.
 */
export class XpringClientErrorMessages {
  public static readonly malformedResponse = "Malformed Response.";
  public static readonly signingFailure = "Unable to sign the transaction";
}

/**
 * XpringClient is a client which interacts with the Xpring platform.
 */
class XpringClient {
  /**
   * Create a new XpringClient.
   *
   * @param networkClient A network client which will manager remote RPCs to Rippled.
   */
  public constructor(
    private readonly networkClient: NetworkClient = defaultNetworkClient
  ) {}

  /**
   * Retrieve the balance for the given address.
   *
   * @param address The address to retrieve a balance for.
   * @returns The amount of XRP in the account.
   */
  public async getBalance(address: string): Promise<XRPAmount> {
    return this.getAccountInfo(address).then(async accountInfo => {
      const balance = accountInfo.getBalance();
      if (balance === undefined) {
        return Promise.reject(
          new Error(XpringClientErrorMessages.malformedResponse)
        );
      }

      return balance;
    });
  }

  public async send(
    sender: Wallet,
    amount: XRPAmount,
    destination: string
  ): Promise<SubmitSignedTransactionResponse> {
    return this.getFee().then(async fee => {
      return this.getAccountInfo(sender.getAddress()).then(
        async accountInfo => {
          if (accountInfo.getSequence() == undefined) {
            return Promise.reject(
              new Error(XpringClientErrorMessages.malformedResponse)
            );
          }

          const payment = new Payment();
          payment.setXrpAmount(amount);
          payment.setDestination(destination);

          const transaction = new Transaction();
          transaction.setAccount(sender.getAddress());
          transaction.setFee(fee);
          transaction.setSequence(accountInfo.getSequence());
          transaction.setPayment(payment);

          var signedTransaction;
          try {
            signedTransaction = Signer.signTransaction(transaction, sender);
          } catch (signingError) {
            const signingErrorMessage =
              XpringClientErrorMessages.signingFailure +
              ". " +
              signingError.message;
            return Promise.reject(new Error(signingErrorMessage));
          }
          if (signedTransaction == undefined) {
            return Promise.reject(
              new Error(XpringClientErrorMessages.signingFailure)
            );
          }

          const submitSignedTransactionRequest = new SubmitSignedTransactionRequest();
          submitSignedTransactionRequest.setSignedTransaction(
            signedTransaction
          );

          return this.networkClient.submitSignedTransaction(
            submitSignedTransactionRequest
          );
        }
      );
    });
  }

  private async getAccountInfo(address: string): Promise<AccountInfo> {
    const getAccountInfoRequest = new GetAccountInfoRequest();
    getAccountInfoRequest.setAddress(address);
    return this.networkClient.getAccountInfo(getAccountInfoRequest);
  }

  private async getFee(): Promise<XRPAmount> {
    const getFeeRequest = new GetFeeRequest();

    return this.networkClient.getFee(getFeeRequest).then(async fee => {
      const feeAmount = fee.getAmount();
      if (feeAmount == undefined) {
        return Promise.reject(
          new Error(XpringClientErrorMessages.malformedResponse)
        );
      }
      return feeAmount;
    });
  }
}

export default XpringClient;
