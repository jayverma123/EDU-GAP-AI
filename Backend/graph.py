import networkx as nx


def build_knowledge_graph(concepts: list[dict]) -> nx.DiGraph:
    graph = nx.DiGraph()

    # Add all concepts as nodes
    for concept in concepts:
        name = concept.get("name")

        if not name:
            continue

        graph.add_node(
            name,
            description=concept.get(
                "description",
                ""
            )
        )

    # Add prerequisite relationships
    for concept in concepts:
        concept_name = concept.get("name")

        if not concept_name:
            continue

        prerequisites = concept.get(
            "prerequisites",
            []
        )

        for prerequisite in prerequisites:
            if not prerequisite:
                continue

            if prerequisite in graph.nodes:
                graph.add_edge(
                    prerequisite,
                    concept_name
                )

    return graph


def validate_knowledge_graph(
    graph: nx.DiGraph
) -> dict:
    cycles = list(
        nx.simple_cycles(graph)
    )

    return {
        "valid": len(cycles) == 0,
        "node_count": graph.number_of_nodes(),
        "edge_count": graph.number_of_edges(),
        "cycles": cycles,
    }


def get_prerequisites(
    graph: nx.DiGraph,
    concept: str
) -> list[str]:

    if concept not in graph:
        return []

    return list(
        graph.predecessors(concept)
    )


def get_dependents(
    graph: nx.DiGraph,
    concept: str
) -> list[str]:

    if concept not in graph:
        return []

    return list(
        graph.successors(concept)
    )