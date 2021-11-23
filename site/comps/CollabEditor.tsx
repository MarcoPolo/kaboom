import * as React from "react";
import Editor, { EditorRef as _EditorRef } from "comps/Editor";
import p2p from "./p2p"
import Automerge from "automerge";
import Libp2p from 'libp2p'
import PeerId from 'peer-id'
// @ts-ignore
import diff from "textdiff-create"

export type EditorRef = _EditorRef;

const updateIntervalRate = 100;
const syncIntervalRate = 1000;

const topic = '/marco/playWithMe'
const syncTopic = '/marco/playWithMe/sync'
const brave = "QmdKf3isP5obxRJgCwdfyDHAiZ5c3a3fmu8eLr5gTb5S4X"
const safari = "QmZ3tPmpMZw4gR5SJfRv1nqrohVvbt217fCwCDvDs9Rs2P"

function CollabEditor(props: React.ComponentProps<typeof Editor> & { peerId: PeerId, target?: PeerId | undefined | null, onRemoteUpdate?: (context: string) => void }, editorRef: React.Ref<EditorRef>) {
  const editorDoc = React.useRef<Automerge.Doc<{ text: Automerge.Text }>>(Automerge.from({ text: new Automerge.Text(props.content) }));
  const lastPublishedDoc = React.useRef<Automerge.Doc<{ text: Automerge.Text }>>(editorDoc.current);

  const libp2p = React.useRef<null | Libp2p>(null)
  React.useEffect(() => {
    p2p({ peerId: props.peerId }).then(async (p2p) => {
      await p2p.start()
      libp2p.current = p2p
      console.log("started p2p, listening on", p2p.multiaddrs.map(ma => ma.toString() + "/p2p/" + p2p.peerId.toB58String()))
      let hasSynced = !props.target
      // let hasSynced = false
      // window.Automerge = Automerge
      libp2p.current.pubsub.on(syncTopic, (msg) => {
        if (!hasSynced) {
          console.log("Data", msg.data)
          editorDoc.current = Automerge.load(msg.data)
          lastPublishedDoc.current = editorDoc.current

          // @ts-ignore
          editorRef?.current?.setContent(editorDoc.current.text.toString())
          console.log("doc is now", editorDoc.current.text.toString())
          hasSynced = true

        }
      })
      await libp2p.current?.pubsub.subscribe(syncTopic)
      let msgsSeen = 0

      libp2p.current.pubsub.on(topic, (msg) => {
        console.log("Seen", msgsSeen++)
        if (!hasSynced) {
          return
        }
        console.log("Got here:", msg)
        const [newDoc, patch] = Automerge.applyChanges(editorDoc.current, [msg.data])
        console.log("Patch is", patch)
        editorDoc.current = newDoc
        lastPublishedDoc.current = editorDoc.current

        // @ts-ignore
        editorRef?.current?.setContent(editorDoc.current.text.toString())
        props.onRemoteUpdate?.(editorDoc.current.text.toString())
      })
      console.log("libp2p.current", libp2p.current)
      await libp2p.current?.pubsub.subscribe(topic)

      if (props.target) {
        console.log("addrs", p2p.multiaddrs.map(ma => ma.toString()))
        let n = 0
        while (true) {
          const target = p2p.multiaddrs[(n++ % p2p.multiaddrs.length)].toString() + "/p2p/" + props.target.toB58String()
          try {
            console.log("trying to dial", target)
            await p2p.dial(target)
            console.log("Dial success!!")
            break
          } catch (e) {
            console.warn("Failed to dial target", e)
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }
    })

    const updateIntervalId = setInterval(() => {
      if (lastPublishedDoc.current === editorDoc.current) {
        return
      }
      const changes = Automerge.getChanges(lastPublishedDoc.current, editorDoc.current)
      lastPublishedDoc.current = editorDoc.current
      Promise.all(changes.map(change => libp2p.current?.pubsub.publish(topic, change)))
    }, updateIntervalRate)

    const syncIntervalId = setInterval(() => {
      const serializedDoc = Automerge.save(editorDoc.current)
      libp2p.current?.pubsub.publish(syncTopic, serializedDoc)
    }, syncIntervalRate)

    return () => {
      clearInterval(updateIntervalId)
      clearInterval(syncIntervalId)
      libp2p.current?.stop()
    }
  }, [])

  const { peerId, ...restProps } = props
  return <Editor ref={editorRef} {...restProps}
    onChange={(newCode) => {
      const deltas = diff(editorDoc.current.text.toString(), newCode)
      if (deltas.length === 0) {
        return
      }

      editorDoc.current = Automerge.change(editorDoc.current, applyDelta(diff(editorDoc.current.text?.toString() || "", newCode)));
      console.log("New code is:", editorDoc.current.text.toString());
      if (props.onChange) {
        props.onChange(newCode)
      }

    }} />

}

const applyDelta = (delta: Array<[-1, number] | [0, number] | [1, string]>) => (doc: Automerge.Doc<{ text: Automerge.Text }>) => {
  // console.log("Doc is", doc.text.toString())

  let index = 0

  // According to latest jsperf tests, there's no need to cache array length
  for (var i = 0; i < delta.length; i++) {
    const item = delta[i]

    if (item[0] === -1) {
      const value = item[1];
      // DELETE
      doc.text.deleteAt!(index, value);
    } else if (item[0] == 0) {
      const value = item[1];
      index += value
    } else {
      const value = item[1];
      // INSERT
      console.log("Inserting", value, "at", index)
      doc.text.insertAt!(index, ...value);
      index += value.length
    }
  }
};

export default React.forwardRef(CollabEditor)