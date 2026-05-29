"""
Smoke tests — verify the app's core wiring without needing a DB or network.

These assert that auto-discovery registers the seed's example agent, workflow,
and trigger template, and that the platform-facing graph builds. They give the
`Test Backend` CI job real coverage and clear the "no tests directory" warning.
"""


def test_components_discover_and_register():
    from backend.infrastructure import discover_and_register_components
    from claritty_sdk import AgentRegistry, WorkflowRegistry, TriggerTemplateRegistry

    discover_and_register_components()

    assert len(AgentRegistry.list_agents()) >= 1
    assert len(WorkflowRegistry.list_workflows()) >= 1
    # The seed ships one example @trigger_template; triggers are platform-managed.
    assert len(TriggerTemplateRegistry.list_templates()) >= 1


def test_graph_builds():
    from backend.infrastructure import discover_and_register_components
    from claritty_sdk import build_graph

    discover_and_register_components()
    graph = build_graph()

    assert isinstance(graph, dict)
    assert "nodes" in graph and "edges" in graph
    assert len(graph["nodes"]) >= 1
