import { Logging } from '@google-cloud/logging';

const logging = new Logging({
  keyFilename: './service-account.json',
});

const glog = logging.log('islamchat');

function logToCloud(message: any, severity: 'INFO' | 'ERROR' = 'INFO') {
  const entry = glog.entry({
    resource: { type: 'global' },
    severity,
  }, message);
  glog.write(entry).catch(console.error);
}

export const log = (payload: any) => {
  console.log(payload);
  logToCloud(payload, 'INFO');
};

export const error = (payload: any) => {
  console.error(payload);
  logToCloud(payload, 'ERROR');
};