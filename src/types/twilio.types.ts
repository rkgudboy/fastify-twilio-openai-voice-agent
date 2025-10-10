export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface IncomingCallWebhook {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  ForwardedFrom?: string;
  CallerName?: string;
}

export interface CallStatusWebhook {
  CallSid: string;
  CallStatus: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  CallDuration?: string;
  Timestamp?: string;
  SequenceNumber?: string;
}

export interface TwilioError {
  status: number;
  message: string;
  code: number;
  moreInfo: string;
}
