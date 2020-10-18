const shift = require("./shift.json");
console.log("shiftの値", shift);
const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

// Load client secrets from a local file.
fs.readFile("credentials.json", (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);
  // Authorize a client with credentials, then call the Google Calendar API.
  authorize(JSON.parse(content), createEvents);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function createEvents(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  createEventPrams().forEach((eventParam) =>
    insert(calendar, auth, eventParam)
  );
}

function insert(calendar, auth, eventParam) {
  console.log("eventPramの値", eventParam);
  calendar.events.insert(
    {
      auth: auth,
      calendarId: "lfv8isj74ejsccbr8hcsb31p5s@group.calendar.google.com",
      resource: eventParam,
    },
    function (err, event) {
      if (err) {
        console.log(
          "There was an error contacting the Calendar service: " + err
        );
        return;
      }
      console.log("Event created: %s", event.htmlLink);
    }
  );
}

function createEventPrams() {
  return [
    ...createEventParam(shift.year, shift.month, shift.early),
    ...createEventParam(shift.year, shift.month, shift.normal),
    ...createEventParam(shift.year, shift.month, shift.late),
    ...createEventParam(shift.year, shift.month, shift.overNight),
  ];
}

function createEventParam(year, month, shiftDetail) {
  const endDate = (date) => (shiftDetail.summary === "夜勤" ? date + 1 : date);
  console.log("shiftDetailの値", shiftDetail);
  return shiftDetail.dates.map((date) => {
    return {
      summary: shiftDetail.summary,
      start: {
        dateTime: `${year}-${month}-${date}T${shiftDetail.start}+09:00`,
      },
      end: {
        dateTime: `${year}-${month}-${endDate(date)}T${shiftDetail.end}+09:00`,
      },
    };
  });
}

// interface ShiftDetail {
//   summary: string;
//   dates: number[];
//   start: string;
//   end: string;
// }

// interface Shift {
//   year: number;
//   month: number;
//   early: ShiftDetail;
//   normal: ShiftDetail;
//   late: ShiftDetail;
//   overNight: ShiftDetail;
// }
