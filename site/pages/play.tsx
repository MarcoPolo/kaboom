import fs from "fs/promises";
import path from "path";
import * as React from "react";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import useKey from "hooks/useKey";
import useSavedState from "hooks/useSavedState";
import useClickOutside from "hooks/useClickOutside";
import useSpaceUsed from "hooks/useSpaceUsed";
import useMediaQuery from "hooks/useMediaQuery";
import Head from "comps/Head";
import Editor, { EditorRef } from "comps/Editor";
import CollabEditor from "../comps/CollabEditor";
import GameView, { GameViewRef } from "comps/GameView";
import Button from "comps/Button";
import ThemeSwitch from "comps/ThemeSwitch";
import Select from "comps/Select";
import View from "comps/View";
import Text from "comps/Text";
import Menu from "comps/Menu";
import Inspect from "comps/Inspect";
import FileDrop from "comps/FileDrop";
import Drawer from "comps/Drawer";
import Draggable from "comps/Draggable";
import Droppable from "comps/Droppable";
import Background from "comps/Background";
import Doc from "comps/Doc";
import download from "lib/download";
import wrapHTML from "lib/wrapHTML";
import Ctx from "lib/Ctx";
import DEMO_ORDER from "public/site/demo/order.json";
import Automerge from "automerge";
import p2p from "../comps/p2p"
import Libp2p from 'libp2p'
import PeerId from 'peer-id'

const DEF_DEMO = "add";
const topic = '/marco/playWithMe'
const syncTopic = '/marco/playWithMe/sync'
const brave = "QmdKf3isP5obxRJgCwdfyDHAiZ5c3a3fmu8eLr5gTb5S4X"
const safari = "QmZ3tPmpMZw4gR5SJfRv1nqrohVvbt217fCwCDvDs9Rs2P"

interface SpriteEntryProps {
	name: string,
	src: string,
}

const SpriteEntry: React.FC<SpriteEntryProps> = ({
	name,
	src,
}) => (
	<Draggable
		focusable
		dir="row"
		align="center"
		gap={1}
		stretchX
		padX={2}
		padY={1}
		rounded
		height={64}
		dragType="sprite"
		dragData={name}
		css={{
			"overflow": "hidden",
			":hover": {
				"background": "var(--color-bg2)",
				"cursor": "pointer",
			},
		}}
	>
		<View width={48} height={48} justify="center">
			<img
				src={src}
				alt={name}
				css={{
					userDrag: "none",
					width: "100%",
					overflow: "hidden",
					objectFit: "cover",
				}}
			/>
		</View>
		<Text>{path.basename(name)}</Text>
	</Draggable>
);

interface SoundEntryProps {
	name: string,
	src: string,
}

const SoundEntry: React.FC<SoundEntryProps> = ({
	name,
	src,
}) => (
	<View
		focusable
		dir="row"
		align="center"
		gap={1}
		stretchX
		padX={2}
		padY={1}
		rounded
		height={48}
		css={{
			"overflow": "hidden",
			":hover": {
				"background": "var(--color-bg2)",
				"cursor": "pointer",
			},
		}}
		onClick={() => new Audio(src).play()}
	>
		<Text>{path.basename(name)}</Text>
	</View>
);

interface Sprite {
	name: string,
	src: string,
}

interface Sound {
	name: string,
	src: string,
}

interface PlayProps {
	demos: Record<string, string>,
}

const Play: React.FC<PlayProps> = ({
	demos,
}) => {

	// if (demos === undefined || demos === null) {
	// 	demos = {}
	// }
	const router = useRouter();
	const demo = router.query.demo as string || DEF_DEMO;
	const code = demos[demo];
	// const code = `const a = "hi"`;
	const { draggin } = React.useContext(Ctx);
	const [backpackOpen, setBackpackOpen] = React.useState(false);
	const [sprites, setSprites] = useSavedState<Sprite[]>("sprites", []);
	const [sounds, setSounds] = useSavedState<Sound[]>("sounds", []);
	const [blackboard, setBlackboard] = React.useState<string | null>(null);
	const editorRef = React.useRef<EditorRef | null>(null);
	const editorRef2 = React.useRef<EditorRef | null>(null);
	const gameviewRef = React.useRef<GameViewRef | null>(null);
	const blackboardRef = React.useRef(null);
	const isNarrow = useMediaQuery("(max-aspect-ratio: 1/1)");;
	const spaceUsed = useSpaceUsed();
	const [make, setMake] = React.useState(false);

	const editorDoc = React.useRef<Automerge.Doc<{ text: Automerge.Text }>>(Automerge.init());
	const lastPublishedDoc = React.useRef<Automerge.Doc<{ text: Automerge.Text }>>(editorDoc.current);

	const debugEditor = false

	const [peer1, setPeer1] = React.useState<PeerId | null>(null)
	const [peer2, setPeer2] = React.useState<PeerId | null>(null)
	const [targetPeer, setTargetPeer] = React.useState<PeerId | null>(null)

	React.useEffect(() => {
		console.log("hash is", window.location.hash.substr(1))
	}, [])

	React.useEffect(() => {
		loadPeer("peer1").then(peer => {
			setPeer1(peer)
		})
		const p2 = loadPeer("peer2").then(peer => {
			setPeer2(peer)
			return peer
		})
		const hash = window.location.hash.substr(1)
		console.log("peer 2 is", peer2?.toB58String())
		if (hash != "") {
			setTargetPeer(PeerId.createFromB58String(hash))
		} else if (debugEditor) {
			p2.then(peer => setTargetPeer(peer))
		}
	}, [])

	// const libp2p = React.useRef<null | Libp2p>(null)
	// React.useEffect(() => {
	// 	p2p().then(async (p2p) => {
	// 		libp2p.current = p2p
	// 		let hasSynced = false
	// 		window.Automerge = Automerge
	// 		libp2p.current.pubsub.on(syncTopic, (msg) => {
	// 			if (!hasSynced) {
	// 				console.log("Data", msg.data)
	// 				editorDoc.current = Automerge.load(msg.data)
	// 				lastPublishedDoc.current = editorDoc.current

	// 				editorRef.current?.setContent(editorDoc.current.text.toString())
	// 				console.log("doc is now", editorDoc.current.text.toString())
	// 				hasSynced = true

	// 			}
	// 		})
	// 		await libp2p.current?.pubsub.subscribe(syncTopic)
	// 		let msgsSeen = 0

	// 		libp2p.current.pubsub.on(topic, (msg) => {
	// 			console.log("Seen", msgsSeen++)
	// 			if (!hasSynced) {
	// 				return
	// 			}
	// 			console.log("Got here:", msg)
	// 			const [newDoc, patch] = Automerge.applyChanges(editorDoc.current, [msg.data])
	// 			console.log("Patch is", patch)
	// 			editorDoc.current = newDoc
	// 			lastPublishedDoc.current = editorDoc.current

	// 			editorRef.current?.setContent(editorDoc.current.text.toString())
	// 			console.log("doc is now", editorDoc.current.text.toString())

	// 			// console.log(`!!!!!received: ${uint8ArrayToString(msg.data)}`)
	// 		})
	// 		console.log("libp2p.current", libp2p.current)
	// 		await libp2p.current?.pubsub.subscribe(topic)

	// 		if (p2p.peerId.toB58String() === brave) {
	// 			p2p.peerStore.addressBook.set(PeerId.createFromB58String(safari), [p2p.multiaddrs[0]])
	// 			console.log("addrs", p2p.multiaddrs.map(ma => ma.toString()))
	// 			const target = p2p.multiaddrs[0].toString() + "/p2p/" + safari
	// 			console.log("I'm brave. dialing", target)
	// 			await p2p.dial(target)
	// 		}
	// 	})
	// 	return () => {
	// 		libp2p.current?.stop()
	// 	}
	// }, [])


	// React.useEffect(() => {
	// 	let msgsSeen = 0
	// 	const id = setInterval(() => {
	// 		if (lastPublishedDoc.current === editorDoc.current) {
	// 			return
	// 		}
	// 		const changes = Automerge.getChanges(lastPublishedDoc.current, editorDoc.current)[0]
	// 		console.log("Published changes", changes, editorDoc.current)
	// 		libp2p.current?.pubsub.publish(topic, changes)
	// 		console.log("sent", msgsSeen++)
	// 		lastPublishedDoc.current = editorDoc.current

	// 		const serializedDoc = Automerge.save(editorDoc.current)
	// 		libp2p.current?.pubsub.publish(syncTopic, serializedDoc)
	// 	}, 500)
	// 	return () => clearInterval(id)
	// }, [libp2p])

	// Init
	React.useEffect(() => {
		editorDoc.current = Automerge.change(editorDoc.current, doc => {
			doc.text = new Automerge.Text(code);
		});
	}, [code])


	// DEMO_ORDER defines the demos that should appear at the top of the list
	// names not defined in the list just fall to their default order
	const demoList = React.useMemo(() => {
		return [...new Set([
			...DEMO_ORDER,
			...Object.keys(demos),
		])];
	}, [demos]);

	React.useEffect(() => {
		if (router.isReady && !router.query.demo) {
			router.replace({
				query: {
					demo: DEF_DEMO,
				},
			}, undefined, { shallow: true, });
		}
	}, [router]);

	useKey("Escape", () => {
		setBackpackOpen(false);
		setBlackboard(null);
	}, [setBackpackOpen, setBlackboard]);

	useKey("b", (e) => {
		if (!e.metaKey) return;
		e.preventDefault();
		setBackpackOpen((b) => !b);
	}, [setBackpackOpen]);

	useClickOutside(blackboardRef, () => setBlackboard(null), [setBlackboard]);


	return <>
		<Head
			title="Kaboom Playground"
			scale={0.6}
			twitterPlayer={{
				url: `https://kaboomjs.com/demo/${demo}`,
				width: 480,
				height: 480,
			}}
		/>
		<Background dir="column" css={{ overflow: "hidden" }}>
			<View
				dir="row"
				align="center"
				justify="between"
				stretchX
				padY={1}
				padX={2}
			>
				<View dir="row" gap={2} align="center">
					<View
						rounded
						desc="Back to home"
					>
						<Link href="/" passHref>
							<a>
								<img
									src="/site/img/k.png"
									css={{
										width: 48,
										cursor: "pointer",
									}}
									alt="logo"
								/>
							</a>
						</Link>
					</View>
					{!make &&
						<Select
							name="Demo Selector"
							desc="Select a demo to run"
							options={demoList}
							value={demo}
							onChange={(demo) => router.push({
								query: {
									demo: demo,
								},
							}, undefined, { shallow: true, })}
						/>
					}
					<Button
						name="Run Button"
						desc="Run current code (Cmd+s)"
						text="Run"
						action={() => {
							if (!editorRef.current) return;
							if (!gameviewRef.current) return;
							const content = editorRef.current.getContent();
							if (content) {
								gameviewRef.current.run(content);
							}
						}}
					/>
				</View>
				<View dir="row" gap={2} align="center">
					{!isNarrow &&
						<ThemeSwitch />
					}
					{!isNarrow && make &&
						<Menu left items={[
							{
								name: "Export",
								action: () => {
									const name = prompt("File name: ");
									download(`${name}.html`, wrapHTML(code));
								},
							}
						]} />
					}
				</View>
			</View>
			<View
				dir={isNarrow ? "column" : "row"}
				gap={2}
				stretchX
				align="center"
				padY={isNarrow ? 1 : 2}
				css={{
					flex: "1",
					overflow: "hidden",
					paddingTop: 2,
					paddingBottom: 16,
					paddingRight: 16,
					paddingLeft: (isNarrow || !make) ? 16 : 44,
				}}
			>
				{peer1 && (!debugEditor || targetPeer) && <CollabEditor
					peerId={peer1}
					target={targetPeer}
					name="Editor"
					desc="Where you edit the code"
					ref={editorRef}
					content={code}
					width={isNarrow ? "100%" : "45%"}
					height={isNarrow ? "55%" : "100%"}
					placeholder="Come on let's make some games!!"
					css={{
						order: isNarrow ? 2 : 1,
						zIndex: 20,
					}}
					onRemoteUpdate={(content) => {
						if (!gameviewRef.current) return false;
						const gameview = gameviewRef.current;
						if (!editorRef.current) return false;
						const editor = editorRef.current;
						gameview.run(content);
					}}
					onChange={(content) => {
						if (!gameviewRef.current) return false;
						const gameview = gameviewRef.current;
						if (!editorRef.current) return false;
						const editor = editorRef.current;
						gameview.run(content);
					}}
					keys={[
						{
							key: "Mod-s",
							run: () => {
								if (!gameviewRef.current) return false;
								const gameview = gameviewRef.current;
								if (!editorRef.current) return false;
								const editor = editorRef.current;
								gameview.run(editor.getContent() ?? undefined);
								return false;
							},
							preventDefault: true,
						},
						{
							key: "Mod-e",
							run: () => {
								if (!editorRef.current) return false;
								const editor = editorRef.current;
								const sel = editor.getSelection() || editor.getWord();
								setBlackboard(sel);
								return false;
							},
							preventDefault: true,
						},
					]}
				/>}
				{debugEditor && peer2 && <CollabEditor
					peerId={peer2}
					name="Editor"
					desc="Where you edit the code"
					ref={editorRef2}
					content={code}
					width={isNarrow ? "100%" : "45%"}
					height={isNarrow ? "55%" : "100%"}
					placeholder="Come on let's make some games!!"
					css={{
						order: isNarrow ? 2 : 1,
						zIndex: 20,
					}}
				/>}
				{!debugEditor && <GameView
					name="Game View"
					desc="Where your game runs"
					ref={gameviewRef}
					code={code}
					width={isNarrow ? "100%" : "auto"}
					height={isNarrow ? "auto" : "100%"}
					css={{
						order: isNarrow ? 1 : 2,
						flex: "1",
						zIndex: 20,
					}}
				/>}
			</View>
			{
				draggin &&
				<Droppable
					stretch
					css={{
						position: "absolute",
						zIndex: 10,
					}}
					accept={["sprite", "sound"]}
					onDrop={(ty, data) => {
						switch (ty) {
							case "sprite":
								setSprites((prev) => prev.filter(({ name }) => name !== data));
							case "sound":
								setSounds((prev) => prev.filter(({ name }) => name !== data));
						}
					}}
				/>
			}
			<View
				name="Blackboard"
				desc="Watch closely what the teacher is demonstrating!"
				ref={blackboardRef}
				height={360}
				width={540}
				rounded
				outlined
				pad={3}
				bg={1}
				css={{
					position: "absolute",
					left: "45%",
					top: blackboard ? -4 : -544,
					transition: "0.2s top",
					overflowY: "auto",
					overflowX: "hidden",
					zIndex: 200,
				}}
			>
				{
					blackboard &&
					<Doc name={blackboard} />
				}
			</View>
			{!isNarrow && make &&
				<Drawer
					name="Backpack"
					desc="A place to put all your stuff"
					handle
					bigHandle
					expanded={backpackOpen}
					setExpanded={setBackpackOpen}
					height="80%"
					pad={2}
				>
					<View padX={1} gap={2} stretchX>
						<Text size="big" color={2}>Backpack</Text>
					</View>
					<FileDrop
						pad={1}
						rounded
						readAs="dataURL"
						gap={1}
						stretchX
						accept="image"
						onLoad={(file, content) => {
							setSprites((prev) => {
								for (const spr of prev) {
									if (spr.src === content) {
										// TODO: err msg?
										return prev;
									}
								}
								return [
									...prev,
									{
										name: file.name,
										src: content,
									},
								];
							})
						}}
					>
						<Text color={3}>Sprites</Text>
						{
							sprites
								.sort((a, b) => a.name > b.name ? 1 : -1)
								.map(({ name, src }) => (
									<SpriteEntry
										key={name}
										name={name}
										src={src}
									/>
								))
						}
					</FileDrop>
					<FileDrop
						pad={1}
						rounded
						readAs="dataURL"
						gap={1}
						stretchX
						accept="^audio/"
						onLoad={(file, content) => {
							setSounds((prev) => {
								for (const snd of prev) {
									if (snd.src === content) {
										// TODO: err msg?
										return prev;
									}
								}
								return [
									...prev,
									{
										name: file.name,
										src: content,
									},
								];
							})
						}}
					>
						<Text color={3}>Sounds</Text>
						{
							sounds
								.sort((a, b) => a.name > b.name ? 1 : -1)
								.map(({ name, src }) => (
									<SoundEntry
										key={name}
										name={name}
										src={src}
									/>
								))
						}
					</FileDrop>
					<View stretchX padX={1}>
						<Text color={4} size="small">Space used: {(spaceUsed / 1024 / 1024).toFixed(2)}mb</Text>
					</View>
				</Drawer>
			}
		</Background>
	</>;

};

// // TODO: getServerSideProps is handy for dev when you're changing demos, but getStaticProps makes more sense for prod since it won't change
export const getStaticProps: GetServerSideProps = async (ctx) => {
	// const { demo } = ctx.query;
	const demo = DEF_DEMO
	const demodir = (await fs.readdir("public/site/demo"))
		.filter((p) => !p.startsWith("."))
	const demos: Record<string, string> = {}
	for (const file of demodir) {
		const ext = path.extname(file)
		const name = path.basename(file, ext)
		if (ext === ".js") {
			demos[name] = await fs.readFile(`public/site/demo/${file}`, "utf8");
		}
	}
	if (!demo || demos[demo as string]) {
		return {
			props: {
				demos,
			},
		};
	} else {
		return {
			notFound: true,
		};
	}
}

export default Play;


async function loadPeer(peerName: string): Promise<PeerId> {
	try {
		const p = await PeerId.createFromJSON(JSON.parse(localStorage[peerName]))
		return p
	} catch (e) {
		const p = await PeerId.create()
		localStorage[peerName] = JSON.stringify(p.toJSON())
		return p
	}
}