// import 'babel-polyfill'
import Libp2p from 'libp2p'
// @ts-ignore
import Websockets from 'libp2p-websockets'
// @ts-ignore
import WebRTCStar from 'libp2p-webrtc-star'
import { NOISE } from '@chainsafe/libp2p-noise'
// @ts-ignore
import Mplex from 'libp2p-mplex'
import Bootstrap from 'libp2p-bootstrap'
import PeerId from 'peer-id'
import Gossipsub from 'libp2p-gossipsub'

import { LevelDatastore } from 'datastore-level'
import Keychain from 'libp2p/src/keychain'

const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')


export default async function p2p({ peerId }: { peerId: PeerId }): Promise<Libp2p> {
  // const datastore = new LevelDatastore('path/to/store')
  // await datastore.open()

  // let peerId
  // try {
  //   peerId = await PeerId.createFromJSON(JSON.parse(localStorage['peerId']))
  // } catch (e) {
  //   console.warn("Failed to parse peerid")
  // }

  // Create our libp2p node
  const libp2p = await Libp2p.create({
    peerId,
    addresses: {
      // Add the signaling server address, along with our PeerId to our multiaddrs list
      // libp2p will automatically attempt to dial to the signaling server so that it can
      // receive inbound connections from other peers
      listen: [
        '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
        '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
        // '/ip4/127.0.0.1/tcp/9090/wss/p2p-webrtc-star'
      ]
    },
    modules: {
      transport: [Websockets, WebRTCStar],
      connEncryption: [NOISE],
      streamMuxer: [Mplex],
      peerDiscovery: [Bootstrap],
      pubsub: Gossipsub
    },
    config: {
      peerDiscovery: {
        // The `tag` property will be searched when creating the instance of your Peer Discovery service.
        // The associated object, will be passed to the service when it is instantiated.
        [Bootstrap.tag]: {
          enabled: true,
          list: [
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
          ]
        }
      }
    }
  })
  // await libp2p.loadKeychain()
  // localStorage['peerId'] = JSON.stringify(libp2p.peerId.toJSON())


  // // UI elements
  // const status = document.getElementById('status')
  // const output = document.getElementById('output')


  // // output.textContent = ''

  // function log(txt) {
  //   // console.info(txt)
  //   // output.textContent += `${txt.trim()}\n`
  // }

  // // Listen for new peers

  // // Listen for new connections to peers
  // libp2p.connectionManager.on('peer:connect', (connection) => {
  //   log(`Connected to ${connection.remotePeer.toB58String()}`)
  //   const peerId = connection.remotePeer
  //   if (peerId === brave || peerId === safari) {
  //     console.log(`!!!Found peer ${peerId.toB58String()}`)
  //   }
  // })

  // // Listen for peers disconnecting
  // libp2p.connectionManager.on('peer:disconnect', (connection) => {
  //   log(`Disconnected from ${connection.remotePeer.toB58String()}`)
  // })

  // const safari = "QmZ3tPmpMZw4gR5SJfRv1nqrohVvbt217fCwCDvDs9Rs2P"
  // // (from 1234)
  // // const safari = "QmVAYDvNBNFEj3a6nduUSHGAwXyASo67kRavkdpzMxX3yF"

  // const brave = "QmdKf3isP5obxRJgCwdfyDHAiZ5c3a3fmu8eLr5gTb5S4X"

  // libp2p.on('peer:discovery', (peerId) => {
  //   if (peerId === brave || peerId === safari) {
  //     console.log(`!!!Found peer ${peerId.toB58String()}`)
  //   }
  // })


  // await libp2p.start()
  // console.log('libp2p started!')
  // console.log(`libp2p id is ${libp2p.peerId.toB58String()}`)
  // log(`libp2p id is ${libp2p.peerId.toB58String()}`)

  // // Export libp2p to the window so you can play with the API
  // window.libp2p = libp2p
  // // libp2p.pubsub.emitSelf = true

  // const topic = '/marco/playWithMe'
  // libp2p.handle('/testMarco/1.0.0', async ({ connection, stream, protocol }) => {
  //   let out = ""
  //   for await (const msg of stream.source) {
  //     // Output the data as a utf8 string
  //     console.log("Gottt", msg.toString())
  //     out += msg.toString()
  //   }

  //   await stream.sink(out)
  // })



  // if (libp2p.peerId.toB58String() === brave) {
  //   libp2p.peerStore.addressBook.set(PeerId.createFromB58String(safari), [libp2p.multiaddrs[0]])
  //   console.log("addrs", libp2p.multiaddrs.map(ma => ma.toString()))
  //   const target = libp2p.multiaddrs[0].toString() + "/p2p/" + safari
  //   console.log("I'm brave. dialing", target)
  //   await libp2p.dial(target)
  //   // publish()

  //   // const { stream } = await libp2p.dialProtocol(target, '/testMarco/1.0.0')
  //   // window.stream = stream
  //   // console.log("ready")

  //   // const res = await stream.sink("Hello from brave")
  //   // console.log("Res", res)
  //   // for await (const msg of stream.source) {
  //   //   // Output the data as a utf8 string
  //   //   console.log("Got", msg.toString())
  //   // }

  //   // setInterval(() => {
  //   //   // libp2p.pubsub.publish(topic, uint8ArrayFromString('Bird bird bird, bird is the word!'))
  //   // }, 1000)
  // } else {
  //   // libp2p.peerStore.addressBook.set(PeerId.createFromB58String(brave), [libp2p.multiaddrs[0]])
  //   // const target = libp2p.multiaddrs[0].toString() + "/p2p/" + brave
  //   // libp2p.dial(brave)
  // }

  return libp2p
}

