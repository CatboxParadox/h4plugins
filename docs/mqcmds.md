![H4P Logo](/assets/MQTTLogo.jpg)

# MQTT message handling

Essential background before using MQTT topic message handling. This document assumes the reader is already familiar with MQTT, topics and the publish/subscribe model

---

# Contents

* [Introduction](#introduction)
* Message Handling
  * [Publishing](#publishing)
  * [Subscribing](#subscribing)

---

# Introduction

[H4P_AsyncMQTT](h4mqtt.md) is a "wrapper" around the [PangolinMQTT](http://github.com/philbowles/PangolinMQTT) library, which means that as well as the examples here and the [H4P_AsyncMQTT](h4mqtt.md), any function in [PangolinMQTT](http://github.com/philbowles/PangolinMQTT) may also be called.

H4Plugins tries to keep identical command syntax across all its methods of controlling the app. When a topic is published by MQTT, it needs an additional prefix, which defines which of your devices receives the message. 

[H4P_AsyncMQTT](h4mqtt.md)automatically subscribes your device to:

* `all/#`
* `< your device name >/#`
* `< your board type >/#`
* `< your board's unique chip ID >/#`

Assuming the actual command is `h4/reboot` then:

```cpp
all/h4/reboot // reboots every H4 device on your network
mydevice/h4/reboot // reboots only the device whose local name is "mydevice"
WEMOS_D1MINI/h4/reboot // reboots every H4 device running on a Wemos D1 mini board
17D858/h4/reboot // reboots only the device with chip ID of 17D848 see note
```

---

# Message handling

## Publishing

Publishing is simple, you have two choices:

* call `publishDevice` which automatically prefixes the topic with your device name
* call any of the functions made available by [PangolinMQTT](http://github.com/philbowles/PangolinMQTT)

The first option makes it easy to see where the message came from in a complex and/or busy network. For example: if your device is named `myThing`

```cpp
h4mqtt.publishDevice("myTopic","MY PAYLOAD");
```

*actually* publishes `myThing/myTopic` with a payload of "MY PAYLOAD"

## Subscribing

Subscribing is a little more involved. To receive any topic messages, you must implement a function to handle the `onConnect` event, e.g.

```cpp
void onMQTTConnect(){
    // do all your subscribes in here
    h4mqtt.subscribe(.... // standard pubsubclient subscribe
    h4mqtt.subscribeDevice(... // special H4P subscribe (see later)
    ...
}

...
[H4P_AsyncMQTT](h4mqtt.md)h4mqtt("myMQTTserver.local",1883,"username","password",onMQTTConnect);
...
```

In that function, (and *only* that function, nowhere else) you must subscribe to any topics your sketch requires. You are strongly advised againt doing any "major work" other than subscribing to your own topics. You are also advised and to provide a similar function for the `onDisconnect` event which *un*subscribes from the same topics.

The "work" that is done for your topics is performed by the callback function named in each of the topic subscriptions, known as the "topic handler" function, e.g.

```cpp
uint32_t myTopicHandler(std::vector<std::string> vs){
    Serial.printf("We just received a ping\n");
    return H4_CMD_OK;
}
...
void onMQTTConnect(){
    h4mqtt.subscribeDevice("ping",myTopicHandler);
    ...
}
```

## The message itself

As already mentioned you can call any method of [PangolinMQTT](http://github.com/philbowles/PangolinMQTT) library e.g. `subscribe(...`  In this case you will be responsible for defining the callback function *and* parsing (splitting apart and "understanding") the message and the payload. This can be quite tricky if you are new to it and has a number of issues that can cause problems:

* The message callback is very much like an Interrupt Service Routine ("ISR") and what you can do safely* inside it is very limited.
* Calling `publish` inside a subscribe callback for example, is a recipe for disaster
* It goes completely outside H4's "main loop" philosophy and will almost certainly "break" your code.

For all of the above reasons, it is recommended that you use only* [H4P_AsyncMQTT](h4mqtt.md) functions. The benefit is they can contain any* code you want and then can* call `publish` with no issues. Also, [H4P_AsyncMQTT](h4mqtt.md) provides a lot of functionality for you when using `subscribeDevice`.

## subscribeDevice

It is important that you understand the MQTT topic syntax before reading his section. If this is not the case [read about MQTT topic syntax](https://mosquitto.org/man/mqtt-7.html) before continuing.

In the following examples, let's assume your device is called `mything` and you want it to handle `mytopic`.

The first thing to note is that your device name is added to the front of the topic, so "under the hood" you are actually subscribing to `mything/mytopic`. This allows you to have many devices in the system running the same code, but retain the ability to send messages only to a single named device (and of course be able to work out who messages are from when they use `publishDevice`)

Secondly, the message and payload are parsed and split up for you already and passed to your callback as a `std::vector<std::string>` Don't worry if you don't know what that means, the examples below will show how easy it is to use - essentially it's just like an array of strings on steroids.

Imagine the topic message was

`mything/mytopic/with/some/subtopics/123456`

First, `mything` is chopped off: we only got this messge because we *are* `mything` so it doesn't tell us anything we don't already know. Secondly, the topic `mytopic` is chopped off, because this message - by defintion - is going to the `mything`  topic handler, whose only purpose in life is to handle `mything` messages. Thus *all* messages that come here are `mything` messages and so we don't need to be told again.

By the time the message gets to your function you will be left with

|vs[0] | vs[1] | vs[2] | vs[3] |
| :---: | :---: | :---: | :---: |
| "with" | "some" | "subtopics" | "123456" |

If you use `vs` as the parameter name in your handler then there are some macros that will make life even easier for you. For example `H4PAYLOAD` if you are expecting a string and `H4PAYLOAD_INT` if you are expecting a number will always return the correct value and make it clear in your code what you are dealing with:

```cpp
std::string payload=H4PAYLOAD; // = "123456": works every time, no matter how many elements in vs
int payloadAsInteger=H4PAYLOAD_INT; // = 123456: does the conversion for you
```

Your callback then "does it thing" and *must* return a value showing if it succeeded or not. It can be any of the following

* H4_CMD_OK
* H4_CMD_UNKNOWN
* H4_CMD_TOO_FEW_PARAMS
* H4_CMD_TOO_MANY_PARAMS
* H4_CMD_NOT_NUMERIC
* H4_CMD_OUT_OF_BOUNDS
* H4_CMD_NAME_UNKNOWN
* H4_CMD_PAYLOAD_FORMAT
* H4_CMD_NOT_NOW

## Simple example

Pulling together all of the above, a simple topic handler will look like something like this:

```cpp
uint32_t myCallback(std::vector<std::string> vs){
    Serial.printf("Msg received with payload=%s\n",H4PAYLOAD.c_str()); // convert payload to C-style string
    if(H4PAYLOAD=="good") return H4_CMD_OK;
    else return H4_CMD_PAYLOAD_FORMAT;
}
```

...and you would set it up like this:

```cpp
h4mqtt.subscribeDevice("mytopic",myCallback); // MUST be done from inside onConnect callback
```

[Example Code](../examples/MQTT/H4P_MQTT_Simple/H4P_MQTT_Simple.ino)

## Subtopics

You may need to implement multiple topics in a kind of "tree" hierarchy like the following, after all, H4Plugins does exactly this.

* `mytopic/a/b/x`
* `mytopic/a/b/y`
* `mytopic/a/c/x`
* `mytopic/a/d/x`

There are two ways to do it. Both can get quite complicated so its best to stick to simple topics if you can, to start with. In this example we are going to look at subtopics and assume that you want to subscribe to `a/b/c` and then in the next section we will look at "wildcards".

(What follows is a feature of the way H4Plugins builds its internal command table and nothing to do with the way MQTT works)

If you just subscribe to `a/b/c` your code may not get called unless you do the following:

```cpp
void onMQTTConnect(){
    h4mqtt.subscribeDevice("a",myCallback);
    h4mqtt.subscribeDevice("a/b",myCallback);
    h4mqtt.subscribeDevice("a/b/c",myCallback);
}
```

i.e. you need to subscribe to each part of the path in turn. This implies that you will also get any topic `a`, any topic `a/b` as well as the desired `a/b/c` .

You will be able to tell which is which because of the size of the `vector<string>` input, "`vs`". It never includes the first part of the topic because in the simple case there is only one part and you know what it is, or your code would never get to the topic handler in the first place. 

Look at it another way from the code above: all topics starting `a`... get sent to `myCallback` ,so we always know what the first part would be if it were included... so including what we already know just wastes space. Other than this, each subtopic is contained in the next entry in vs, with the payload always being in the final entry.

So if someone publishes `a/b/c` with a payload of "sub-standard", `vs` when sent to myCallback would look like:

```cpp
vs[0]="b"
vs[1]="c"
vs[2]="sub-standard"
//
vs.size() == 3
```

If the message was `a/b` with a payload of "sub-standard", `vs` would look like:

```cpp
vs[0]="c"
vs[1]="sub-standard"
//
vs.size() == 2
```

...and if someone publishes `a` with a payload of "sub-standard", `vs` would look like:

```cpp
vs[0]="sub-standard"
//
vs.size() == 1
```

As you can see, this could get complicated when multiple subtopics are required, which is why the world invented MQTT wildcards.

[Example Code](../examples/MQTT/H4P_MQTT_Subtopics/H4P_MQTT_Subtopics.ino)

## Wildcard topics

**N.B.** *[H4P_AsyncMQTT](h4mqtt.md)Supports ONLY `#` wildcards. It does NOT support `+` wildcards**

When handling wildcard topics, your callback needs to take care to validate *everything* after the "#" since neither you nor [H4P_AsyncMQTT](h4mqtt.md)- by defintion - can predict what it will be and MQTT itself will allow anything (including *nothing*). Assume for example you subscribe to `cards/#` but you are only really interested in `cards/hearts`, `cards/clubs`, `cards/diamonds` and `cards/spades`.

You could easily receive `mydevice/cards/junk/Ace/morejunk/totalrubbish/63/XYZ`. [H4P_AsyncMQTT](h4mqtt.md) will dutifully parse this into:

```cpp
// don't forget the first part is always omitted: this code IS the 'cards' handler!
vs[0]="junk"
vs[1]="Ace"
...
vs[5]="XYZ"
```

You could also legitimately receive `mydevice/cards` - thats the way MQTT "#" works.

If your code expects exactly one subtopic, it will almost certainly break when there are none. If it relies on `vs[0]` being a valid suit, it *will* break. It is up to you to prevent this.

You *must* validate both the number of arguments (subtopics) and "sensible" values for each before trying to process the message, remembering to return the appropriate error code if you are unable to handle the message.

[Example Code](../examples/MQTT/MQTT_Wildcards/MQTT_Wildcards.ino)

---

(c) 2021 Phil Bowles h4plugins@gmail.com

* [Facebook H4  Support / Discussion](https://www.facebook.com/groups/444344099599131/)
* [Facebook General ESP8266 / ESP32](https://www.facebook.com/groups/2125820374390340/)
* [Facebook ESP8266 Programming Questions](https://www.facebook.com/groups/esp8266questions/)
* [Facebook ESP Developers (moderator)](https://www.facebook.com/groups/ESP8266/)
* [Support me on Patreon](https://patreon.com/esparto)