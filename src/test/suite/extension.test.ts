// import * as assert from 'assert';
import * as yaml from 'yaml';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../extension';

// vscode.window.showInformationMessage('Start all tests.');
const testYaml = `---
# This is a comment
name: John Doe
age: 30
address:
  street: 123 Main St
  city: Anytown
  state: CA
  zip: 12345
phoneNumbers:
  - type: home
    number: 555-555-5555
  - type: work
    number: 555-555-5556
`
test('YAML test', () => {
  let doc = yaml.parseDocument(testYaml);
  let address = doc.get('address');
  if (yaml.isCollection(address)) {
    console.log(address.get('street'));
    console.log(address.get('city'));
  }
});
