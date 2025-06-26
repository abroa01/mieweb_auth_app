import { execSync } from 'child_process';
import { tmpdir } from 'os';
import getPort from 'get-port';
import readline from 'readline-sync';
import https from 'https';
import fs from 'fs';

async function startServer() {
    console.log("starting the server.......");
    
  const availablePort = process.env.PORT || await getPort();
  let yubi;
  // check to see if YUBI_OTP is in the environment first
  if (process.env.YUBI_OTP) {
    yubi = process.env.YUBI_OTP;
  } else {
    yubi = readline.question('Please tap your YubiKey to continue: ', {
      hideEchoBack: true
    });
  }
  if (!yubi) {
    console.error('YubiKey variable empty!');
    return;
  }
  https.get(`https://api-magic-box.dev.bluehive.com/register-dev-system?yubiKey=${yubi}&port=${availablePort}&customHandle=mieauth`, (res) => {
    res.on('data', (d) => {
      const mbOutput = d.toString();
      process.stdout.write(mbOutput + '\n');
      // Get URL from magic box output, eg: "System Registered Successfully for https://blah-ai.dev.bluehive.com using IP (a.b.c.d)"
      const url = mbOutput.match(/for (https:.*?)\s/);
      if (url) {
        process.env.ROOT_URL = url[1];
        process.env.LOCAL_USER = url[1].match(/https:\/\/(.*?)-mieauth/)[1];
      } else {
        console.error('Could not find URL in magic box output');
      }
    });
    res.on('end', () => {
      // Start up meteor
      console.log(`Starting up meteor on port ${availablePort}`);

      // Default STORAGE_PATH to "/storage" if not set in environment
      //process.env.STORAGE_PATH = process.env.STORAGE_PATH || '/storage';

      // make sure we can touch the storage path, if not, set to os.tmpdir
    //   try {
    //     fs.accessSync(process.env.STORAGE_PATH, fs.constants.W_OK);
    //   } catch (err) {
    //     console.error(err);
    //     console.error('Storage path not writable, setting to os.tmpdir.');
    //     console.error('If you don\'t like this, set the STORAGE_PATH environment variable to a writable directory.');
    //     process.env.STORAGE_PATH = tmpdir();
    //     console.log('STORAGE_PATH', process.env.STORAGE_PATH);
    //   }

      // if we have an argument, pass it to meteor

      const args = process.argv.slice(2);

      // if we have any args, include "--mobile-server" so that the mobile app can connect

      if (args.length > 0) {
        args.push('--mobile-server', process.env.ROOT_URL);
      }

      execSync(`meteor run ${args.join(' ')} --settings settings.json --port ${availablePort}`, {
        stdio: 'inherit'
      });
    });
  }).on('error', (e) => {
    console.error(e.message.replace(/\n|\r/g, ''));
  });
}

startServer();