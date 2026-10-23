export function googleProfileFromClaims(claims={}) {
  if (!claims.sub) throw Object.assign(new Error('Token Google sin subject'),{status:401});
  return {
    provider:'GOOGLE',
    subject:String(claims.sub),
    email:claims.email || null,
    email_verified:Boolean(claims.email_verified),
    name:claims.name || null,
    given_name:claims.given_name || null,
    family_name:claims.family_name || null,
    picture:claims.picture || null,
    locale:claims.locale || null
  };
}

export async function verifyGoogleCredential(credential,{clientId=process.env.GOOGLE_CLIENT_ID,verifyIdToken}={}) {
  if (!credential) throw Object.assign(new Error('credential es obligatorio'),{status:400});
  if (!clientId) throw Object.assign(new Error('Google Identity no configurado'),{status:503});

  if (verifyIdToken) {
    const claims=await verifyIdToken({idToken:credential,audience:clientId});
    return googleProfileFromClaims(claims);
  }

  const {OAuth2Client}=await import('google-auth-library');
  const client=new OAuth2Client();
  const ticket=await client.verifyIdToken({idToken:credential,audience:clientId});
  return googleProfileFromClaims(ticket.getPayload());
}

export function googlePatch(profile) {
  return {
    google_sub:profile.subject,
    email:profile.email,
    email_verified:profile.email_verified,
    avatar_url:profile.picture,
    name:profile.name || undefined
  };
}
