LOOP + GRAPH + CONTEXT ENGINEERING = THE KIMI K3 STACK THAT KEEPS RUNNING
loop engineering is the phrase everyone is throwing around right now. here is what all three layers look like once you actually wire them around 300 agents instead of describing them in the abstract
I read four different breakdowns of loop engineering before it bothered me that every one of them stopped at a single agent per run
Same idea in all four: stop prompting by hand, build the system that prompts for you. Nobody I found had tried the shape with three hundred agents running at once.
That is what pulled me into Kimi K3's Agent Swarm. A swarm launch is not a bigger prompt. It is the same five-part loop any automation needs - trigger, work, gate, state, stop - compressed into one config block.
Once that clicked, the question stopped being "is K3 good" and became "what do I build around it so it still works after I close the laptop."
Three layers do that work, and they stack rather than replace each other. Loop engineering decides when the swarm runs and when it is allowed to stop. Graph engineering decides what it keeps. Context engineering decides what survives once the window closes.
1/ The Shape Underneath Every Loop
2/ Loop Engineering - Four Ways to Trigger the Same Swarm
None of this ships as a button. You wire the trigger yourself, the way you would around any model's API. The only thing changing between these four is what starts the run.
Shape
Starts when
Stops when
Best for
Manual
You launch the block
The STOP line holds
A question you have not mapped yet
Threshold
Last run left nodes unverified
Every node clears the bar
Filling gaps without re-paying for finished work
Scheduled
A cron interval elapses
The run completes
Markets that move - pricing, filings, rankings
Event-triggered
A webhook fires
The swarm processes it and exits
Staying current without watching a clock
Manual - the block you write first

swarm_launch.md
---------------
TASK: map the mobile-payments space. one agent per company.
SOURCES: SEC filings, App Store rankings, funding rounds.
STOP: every node has at least two verified sources.
CONNECT: link any two companies that share an investor,
  a processor, or a regulatory filing.
Threshold - re-firing only on what is incomplete
swarm_resume.md
---------------
GRAPH: reuse graph id kimi-mobile-payments-07
TASK: only nodes still below 2 verified sources
STOP: every node in the graph clears that bar
CONNECT: extend edges for anything newly verified
Scheduled - cron does the waking up
# every Monday, 6am - relaunch the same block against fresh sources
0 6 * * 1  curl -X POST api.moonshot.cn/v1/swarm \
  -d @swarm_launch.json \
  -H "Authorization: Bearer $KIMI_KEY"
Event-triggered - the swarm reacts instead of waiting
on_event: new_sec_filing
  filter: filer in tracked_graph.nodes
  action: relaunch swarm_launch.md, scoped to the filer
  merge: new nodes and edges into the existing graph
The four guards that keep a loop from eating your budget
Three hundred agents make every mistake three hundred times, in parallel, at once.
Guard
What it does
Where it goes
Turn cap
Ends the run after N cycles even if the goal is unmet
The launch block, next to STOP
Per-run budget
Kills the swarm at a token ceiling
The API call, not the prompt
Fan-out limit
300 agents is the ceiling, rarely the right number - 40 nodes needs 40 agents
Scope line of the task
Fresh-context verifier
A second pass that never saw the first one write the answer
A separate call after the merge
That last one matters more than the other three combined. An agent grading work it produced sees the reasoning that went into it and approves. 
A verifier launched cold sees the output alone and finds the hole. Tuning a standalone skeptic is far easier than making an author self-critical.
3/ Graph Engineering - Designing Nodes and Edges Before You Launch
Run a flat swarm across a hundred companies and you get a hundred write-ups. Finding the three that share a supplier means reading all hundred and holding the connections in your head - fine at ten sources, unworkable past a hundred, since the possible relationships between a hundred nodes run into the thousands.
The fix is deciding the schema up front, because a graph built without one turns into a hairball nobody can query.
Design rule
Why it holds
A node is something you will ask a question about later
"Stripe" is a node, "Stripe raised money in 2021" is a fact that belongs inside one
Every edge carries a type and a source
An untyped edge tells you two things are related and nothing more
Canonical names before the merge
"Block", "Square" and "Block Inc" become three nodes and split every cluster in half
A relevance threshold on edges
Link everything to everything and the graph stops separating signal from filler
Nodes land first, edges second
Connections drawn across the complete set beat connections drawn against whatever returned first
{
  "node":  { "id": "n041", "label": "Adyen", "type": "company",
             "sources": ["sec:0001", "appstore:rank-2026-07"] },
  "edge":  { "from": "n041", "to": "n077", "type": "shared_processor",
             "evidence": "sec:0001 p.14", "confidence": 0.86 }
}
The evidence field is what separates a graph you can defend from a graph you have to trust. Every edge traces back to the document that created it, so when a founder asks why two of their competitors are linked, the answer is a page number.
graph.query · live
query> which node carries the most inbound edges?
→ node #041 - shared processor across 9 other nodes
query> what connects #012 and #077?
→ path: #012 → SEC filing → #077
query> which cluster has no external dependency?
→ cluster C: 6 nodes, fully self-hosted stack
python
None of those three questions were in the original task. All three answer in one step, because the relationship got stored instead of thrown out with the write-up
4/ Context Engineering - the Million Tokens Are Not Memory
A model with a million tokens of room feels like it should remember the last run. Every new session opens that window empty. Moonshot's own engineering notes describe the 1M window as more space to reason inside one sitting, and nothing underneath it claims otherwise.
There are two separate context problems in a swarm, and mixing them up is the expensive mistake.
Problem one: the window during the run. Each agent gets its own context. The orchestrator merging 300 returns is the one that runs out of room. The fix is making agents return a fixed shape instead of prose:
RETURN (per agent, nothing else):
  node_id · label · type
  sources: [max 3, url + date]
  candidate_edges: [target label + relation type + evidence line]
  confidence: 0-1
Prose from 300 agents overflows anything. A schema from 300 agents merges deterministically and costs a fraction of the tokens.
Problem two: what survives the session. That has to live outside the window, in two ordinary files.
Artifact
What it holds
What breaks without it
SKILL.md
The procedure that worked - input shape, agent steps, return schema
Every run relearns the workflow from nothing
CONSTRAINTS.md
Corrections from past runs - what got missed, what got flagged wrong
The swarm repeats last month's mistake at full speed
CONSTRAINTS.md - loaded at the start of every swarm launch
- every node needs 2 sources before it counts as verified
- canonicalize company names against the alias table first
- do not silently merge conflicting filings, flag them
- [the mistake from last run you do not want repeated]
A skill file without constraints gets faster over time. A skill file with constraints gets faster and stops repeating the same error, and only the second one behaves like memory
5/ The Run I Actually Did
[ WHAT I GAVE IT ]    a hundred-company competitive teardown
[ PROMPT I USED ]     the manual block from section 2, one line swapped for the market
[ WHAT IT DELIVERED ] a graph with four visible clusters and one hub node holding
                       nine inbound edges - the single vendor a third of the market
                       depends on without anyone flagging it
[ TIME ]              under an hour, unattended
[ COST ]              a fraction of what a contract analyst charges for the same
                       competitive map, which typically runs into four figures
I never asked for that hub node. It surfaced because the relationships stayed structured instead of being flattened into a report I would have had to read cover to cover to notice the same thing.
6/ The Mechanic, and Where K3 Fits
Layer
Supplies
Fails as
Loop
Trigger, gate, stop condition, budget cap
A run that never ends or never starts
Graph
Typed nodes and edges with evidence attached
A hairball nobody queries twice
Context
Return schema in the run, two files after it
A swarm that relearns everything weekly
Pull one out and the whole thing downgrades. A graph with no loop is a frozen snapshot. A loop with no graph produces a faster pile. A skill file with no constraints repeats the old mistake on schedule.
As for why K3 specifically rather than waiting for whatever ships next month: it went from #18 to #1 on the Frontend Code Arena in a single July update, leading six of seven frontend domains. That runs none of the loop for you. It means the agent doing the work, three hundred times over, is currently one of the sharper ones you can point at the problem.
The Money Angle
Channel
What it pays
What you need first
Sold competitive teardown
Replaces a four-figure analyst contract with an hour of swarm time and your markup
One wired graph you can show a founder
Retainer on a live market graph
Recurring fee for re-running the loop weekly and flagging new edges
The first client's graph already built
Wiring the stack for other builders
One-time fee to set up loop, graph schema and constraints for someone else's use case
This exact stack, tested once on your own market
Entry point is a $20-tier subscription and one recurring, checkable question worth mapping.
The stack:
📁 Kimi K3 / Agent Swarm
↳ kimi.ai
📁 Loop engineering, the same five-part shape applied to Claude Code
↳ see the companion piece on /loop, /goal, /schedule
Which of the four trigger shapes above already matches something you check by hand every week?