import firebase from 'firebase/app'
import 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyB-Jp-5Dn6KsDCgqSJ8AtGfBiLmFVm4lGI",
  authDomain: "bitflyer-chat.firebaseapp.com",
  databaseURL: "https://bitflyer-chat.firebaseio.com",
  projectId: "bitflyer-chat",
  storageBucket: "bitflyer-chat.appspot.com",
  messagingSenderId: "5060716168",
  appId: "1:5060716168:web:2f135ec327b437393ce13d"
};

const firebaseApp = firebase.initializeApp(firebaseConfig)

const db = firebaseApp.firestore()

export { db }