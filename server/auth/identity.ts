// Provider-neutral seam for authentication. The app only ever needs "this
// request belongs to this account", so the whole surface is one verify call.
// Swapping identity providers means replacing the implementation behind this
// interface, not touching the routes (same idea as the LLM provider seam).
export interface VerifiedIdentity {
  // The identity provider's stable id for the account. Social sign-ins are
  // linked into one account by the provider, so this stays the same whether the
  // person came in through Google or another connector.
  subject: string;
}

export interface TokenVerifier {
  name: string;
  verify(token: string): Promise<VerifiedIdentity>;
}
