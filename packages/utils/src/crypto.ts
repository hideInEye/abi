import AES from 'crypto-js/aes'
import Utf8 from 'crypto-js/enc-utf8'

export class Crypto<T extends object> {
  /** Secret */
  secret: string

  constructor(secret: string) {
    this.secret = secret
  }

  encrypt(data: T): string {
    const dataString = JSON.stringify(data)
    const encrypted = AES.encrypt(dataString, this.secret)
    return encrypted.toString()
  }

  decrypt(encrypted: string) {
    const decrypted = AES.decrypt(encrypted, this.secret)
    const dataString = decrypted.toString(Utf8)
    try {
      return JSON.parse(dataString) as T
    } catch {
      // avoid parse error
      return null
    }
  }
}
