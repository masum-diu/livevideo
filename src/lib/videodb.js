import { connect } from 'videodb'

let connection

export function getVideoDBConnection() {
  if (!connection) {
    if (!process.env.VIDEODB_API_KEY) {
      throw new Error('VIDEODB_API_KEY is not set')
    }
    connection = connect(process.env.VIDEODB_API_KEY)
  }
  return connection
}
