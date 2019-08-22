import * as Networking from "./network-client";
import { RippledClient } from "../generated/rippled_pb_service";
import { AccountInfo, AccountInfoRequest, InjectionRequest, InjectionResponse } from "../generated/rippled_pb";

/**
 * The default URL to look for a remote Xpring Platfrom GRPC service on.
 */
const defaultGRPCURL = "127.0.0.1:3001";

/**
 * A GRPC Based network client.
 */
class GRPCNetworkClient implements Networking.NetworkClient {
  private readonly grpcClient: RippledClient;

  public constructor(grpcURL = defaultGRPCURL) {
    this.grpcClient = new RippledClient(grpcURL);
  }

  public async getAccountInfo(
    accountInfoRequest: AccountInfoRequest
  ): Promise<AccountInfo> {
    return new Promise((resolve, reject): void => {
      this.grpcClient.getAccountInfo(
        accountInfoRequest,
        (error, response): void => {
          if (error != null || response == null) {
            reject(error);
            return;
          }
          resolve(response);
        }
      );
    });
  }

  public async injectOperation(injectionRequest: InjectionRequest): Promise<InjectionResponse> {
    return new Promise((resolve, reject): void => {
      this.grpcClient.inject(
        injectionRequest,
        (error, response): void => {
          if (error != null || response == null) {
            reject(error);
            return;
          }
          resolve(response);
        }
      );
    });
  }


}

export default GRPCNetworkClient;
