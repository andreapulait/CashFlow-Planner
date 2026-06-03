/**
 * Stub — residuo Manus. Le API Forge non sono più disponibili in questo ambiente.
 */

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  _apiId: string,
  _options: DataApiCallOptions = {}
): Promise<unknown> {
  throw new Error("Not implemented: callDataApi is a Manus stub");
}
