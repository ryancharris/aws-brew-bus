const axios = require("axios");
const queryString = require("query-string");

const AWS = require("aws-sdk");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const cloudfront = new AWS.CloudFront();

// S3 Constants
const BUCKET_NAME = "directions-bucket";
const DISTRIBUTION_ID = "E3R9BZ54XH62AL";
const {
  THIRTY_TWO_TO_HOME_FILE,
  THIRTY_TWO_TO_WORK_FILE,
  FORTY_EIGHT_TO_HOME_FILE,
  FORTY_EIGHT_TO_WORK_FILE
} = require("./fileNameConstants");
const {
  FORTY_EIGHT_TO_HOME,
  FORTY_EIGHT_TO_WORK,
  THIRTY_TWO_TO_HOME,
  THIRTY_TWO_TO_WORK
} = require("./routeInfoConstants");

function getDirectionsData(params) {
  const stringifiedParams = queryString.stringify(params);
  const mapsKey = process.env.MAPS_API_KEY;
  const mapsApiUrl = `https://maps.googleapis.com/maps/api/directions/json?${stringifiedParams}&key=${mapsKey}`;

  return axios({
    method: "get",
    url: mapsApiUrl
  })
    .then(function(response) {
      console.log("Received data from Directions API...");
      return response.data;
    })
    .catch(function(error) {
      return error;
    });
}

function addFileToBucket(bucket, key, body) {
  return s3.putObject(
    {
      Body: JSON.stringify(body),
      Bucket: bucket,
      ContentType: "application/json",
      Key: key,
      ACL: "public-read"
    },
    (err, data) => {
      if (err) return console.log("Error adding JSON to bucket");
      return console.log(`Added JSON to bucket: ${key}`);
    }
  );
}

function constructCloudFrontParams() {
  const date = new Date();
  const timestamp = date.toISOString();

  return {
    DistributionId: DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: timestamp,
      Paths: {
        Quantity: 1,
        Items: ["/*"]
      }
    }
  };
}

module.exports.getDirectionsHome = async event => {
  const thirtyTwoHomePromise = getDirectionsData(THIRTY_TWO_TO_HOME)
    .then(data => addFileToBucket(BUCKET_NAME, THIRTY_TWO_TO_HOME_FILE, data))
    .then(res => {
      return console.log(`Created ${THIRTY_TWO_TO_HOME_FILE}`);
    })
    .catch(s3err => {
      return console.log(`Error creating ${THIRTY_TWO_TO_HOME_FILE}`);
    });

  const fortyEightHomePromise = getDirectionsData(FORTY_EIGHT_TO_HOME)
    .then(data => addFileToBucket(BUCKET_NAME, FORTY_EIGHT_TO_HOME_FILE, data))
    .then(res => {
      return console.log(`Created ${FORTY_EIGHT_TO_HOME_FILE}`);
    })
    .catch(s3err => {
      return console.log(`Error creating ${FORTY_EIGHT_TO_HOME_FILE}`);
    });

  return Promise.all([thirtyTwoHomePromise, fortyEightHomePromise])
    .then(res => {
      const distributionParams = constructCloudFrontParams();

      cloudfront.createInvalidation(distributionParams, (err, data) => {
        if (err) {
          console.log(err);
        } else {
          console.log("CloudFront invalidated successfully!");
        }
      });

      return {
        statusCode: 200,
        body: "*** All JSON files created and stored in S3!"
      };
    })
    .catch(err => {
      return {
        statusCode: 500,
        body: "*** Error saving directions files to S3!"
      };
    });
};

module.exports.getDirectionsWork = async event => {
  const thirtyTwoWorkPromise = getDirectionsData(THIRTY_TWO_TO_WORK)
    .then(data => addFileToBucket(BUCKET_NAME, THIRTY_TWO_TO_WORK_FILE, data))
    .then(res => {
      return console.log(`Created ${THIRTY_TWO_TO_WORK_FILE}`);
    })
    .catch(s3err => {
      return console.log(`Error creating ${THIRTY_TWO_TO_WORK_FILE}`);
    });

  const fortyEightWorkPromise = getDirectionsData(FORTY_EIGHT_TO_WORK)
    .then(data => addFileToBucket(BUCKET_NAME, FORTY_EIGHT_TO_WORK_FILE, data))
    .then(res => {
      return console.log(`Created ${FORTY_EIGHT_TO_WORK_FILE}`);
    })
    .catch(s3err => {
      return console.log(`Error creating ${FORTY_EIGHT_TO_WORK_FILE}`);
    });

  return Promise.all([thirtyTwoWorkPromise, fortyEightWorkPromise])
    .then(res => {
      const distributionParams = constructCloudFrontParams();

      cloudfront.createInvalidation(distributionParams, (err, data) => {
        console.log("hi");
        if (err) {
          console.log(err);
        } else {
          console.log("CloudFront invalidated successfully!");
        }
      });

      return {
        statusCode: 200,
        body: "*** All JSON files created and stored in S3!"
      };
    })
    .catch(err => {
      return {
        statusCode: 500,
        body: "*** Error saving directions files to S3!"
      };
    });
};
