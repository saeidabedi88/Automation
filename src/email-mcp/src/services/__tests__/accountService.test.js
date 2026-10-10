const fs = require('fs');
const path = require('path');
const os = require('os');

describe('accountService', () => {
  let tmpDir;
  let accountService;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acct-'));
    process.env.EMAIL_DATA_DIR = tmpDir;
    delete process.env.IMAP_USER;
    delete process.env.IMAP_PASSWORD;
    jest.resetModules();
    accountService = require('../accountService');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('lists provider presets including gmail', () => {
    const presets = accountService.getProviderPresets();
    expect(presets.gmail.imapHost).toBe('imap.gmail.com');
    expect(presets.outlook.smtpHost).toContain('office365');
  });

  test('listAccounts starts empty and never exposes passwords', async () => {
    // Bypass live IMAP by writing a store directly
    const storePath = path.join(tmpDir, 'email-accounts.json');
    fs.writeFileSync(
      storePath,
      JSON.stringify({
        accounts: [{
          id: 'a1',
          label: 'Work',
          email: 'work@gmail.com',
          provider: 'gmail',
          password: 'secret-app-password',
          enabled: true
        }]
      })
    );

    jest.resetModules();
    process.env.EMAIL_DATA_DIR = tmpDir;
    accountService = require('../accountService');

    const accounts = accountService.listAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].email).toBe('work@gmail.com');
    expect(accounts[0].password).toBeUndefined();
    expect(accounts[0].hasPassword).toBe(true);
  });
});
