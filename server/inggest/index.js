import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "connectify-app" });

//Inggest function to save user data to database


// Create an empty array where we'll export future Inngest functions
export const functions = [];