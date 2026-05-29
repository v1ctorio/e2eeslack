
export interface registrationPage {
  user: string; // slack id 
  user_name: string;
  kind: 'registration'; // kind of page 
}
export interface writeMessagePage {
    user: string;
    user_name: string;
    kind: 'write_message';
    recipients: string[]; // recipient slack ids
}

export type PageKind = registrationPage | writeMessagePage

export interface UserData {
//  slack_id: string; the slack ID is they key
  public_key: string;
  private_key: string; // Private keys should ALWAYS have a passphrase
  fingerprint: string;
}



export interface RegistrationFormData {
  private_key: string
  public_key: string
  slug: string
}
