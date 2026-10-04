"use client";

import { useMemo, useState } from "react";

export default function KnowledgeGraph({
    concepts = [],
    graph = null,
    onSelect,
}) {
    const [selected, setSelected] = useState(null);

    /*
     * Use NetworkX edges when available.
     * Fall back to concept prerequisites for compatibility.
     */
    const edges = useMemo(() => {
        if (graph?.edges?.length) {
            return graph.edges;
        }

        const fallback = [];

        concepts.forEach((concept) => {
            (concept.prerequisites || []).forEach(
                (prerequisite) => {
                    fallback.push({
                        from: prerequisite,
                        to: concept.name,
                    });
                }
            );
        });

        return fallback;
    }, [graph, concepts]);

    /*
     * Arrange nodes in a simple layered layout.
     *
     * This keeps the UI dependency-free while the backend
     * remains responsible for the actual graph relationships.
     */
    const positions = useMemo(() => {
        const positionMap = {};

        if (!concepts.length) {
            return positionMap;
        }

        const incoming = {};

        concepts.forEach((concept) => {
            incoming[concept.name] = 0;
        });

        edges.forEach((edge) => {
            if (incoming[edge.to] !== undefined) {
                incoming[edge.to] += 1;
            }
        });

        const roots = concepts.filter(
            (concept) =>
                (incoming[concept.name] || 0) === 0
        );

        const remaining = concepts.filter(
            (concept) =>
                !roots.some(
                    (root) =>
                        root.name === concept.name
                )
        );

        const layers = [];

        if (roots.length) {
            layers.push(roots);
        }

        if (remaining.length) {
            layers.push(remaining);
        }

        /*
         * If everything is in one layer, split it into
         * smaller groups so the graph remains readable.
         */
        if (layers.length === 1 && concepts.length > 3) {
            layers.length = 0;

            const chunkSize = 3;

            for (
                let i = 0;
                i < concepts.length;
                i += chunkSize
            ) {
                layers.push(
                    concepts.slice(
                        i,
                        i + chunkSize
                    )
                );
            }
        }

        layers.forEach((layer, layerIndex) => {
            const count = layer.length;

            layer.forEach((concept, index) => {
                const x =
                    ((index + 1) /
                        (count + 1)) *
                    100;

                const y =
                    ((layerIndex + 1) /
                        (layers.length + 1)) *
                    100;

                positionMap[concept.name] = {
                    x,
                    y,
                };
            });
        });

        /*
         * Safety fallback for any node that somehow did not
         * receive a position.
         */
        concepts.forEach((concept, index) => {
            if (!positionMap[concept.name]) {
                positionMap[concept.name] = {
                    x: 50,
                    y:
                        15 +
                        (index * 18) %
                        70,
                };
            }
        });

        return positionMap;
    }, [concepts, edges]);

    const selectConcept = (concept) => {
        setSelected(concept);

        if (onSelect) {
            onSelect(concept);
        }
    };

    const findConcept = (name) => {
        return concepts.find(
            (concept) =>
                concept.name?.toLowerCase() ===
                name?.toLowerCase()
        );
    };

    if (!concepts.length) {
        return (
            <div className="flex min-h-[500px] items-center justify-center rounded-[36px] border border-[#dedbd3] bg-white">
                <div className="text-center">
                    <div className="text-xl font-bold">
                        No concepts available
                    </div>

                    <p className="mt-2 text-sm text-[#8794a8]">
                        Upload learning material first.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-[620px] overflow-hidden rounded-[36px] border border-[#dedbd3] bg-white">
            {/* subtle background decoration */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e9eee8] opacity-60 blur-3xl" />

            {/* Graph connections */}
            <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                <defs>
                    <marker
                        id="edugap-arrow"
                        markerWidth="6"
                        markerHeight="6"
                        refX="5"
                        refY="3"
                        orient="auto"
                    >
                        <path
                            d="M0,0 L6,3 L0,6 Z"
                            fill="#aab4ad"
                        />
                    </marker>
                </defs>

                {edges.map(
                    (edge, index) => {
                        const source =
                            positionMap(
                                positions,
                                edge.from
                            );

                        const target =
                            positionMap(
                                positions,
                                edge.to
                            );

                        if (
                            !source ||
                            !target
                        ) {
                            return null;
                        }

                        return (
                            <line
                                key={`${edge.from}-${edge.to}-${index}`}
                                x1={source.x}
                                y1={source.y}
                                x2={target.x}
                                y2={target.y}
                                stroke="#b7c0ba"
                                strokeWidth="0.35"
                                markerEnd="url(#edugap-arrow)"
                            />
                        );
                    }
                )}
            </svg>

            {/* Nodes */}
            {concepts.map(
                (concept, index) => {
                    const position =
                        positions[
                        concept.name
                        ];

                    const active =
                        selected?.name ===
                        concept.name;

                    return (
                        <button
                            key={`${concept.name}-${index}`}
                            onClick={() =>
                                selectConcept(
                                    concept
                                )
                            }
                            className={`absolute flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 px-3 text-center text-xs font-bold transition-all duration-300 md:h-36 md:w-36 md:text-sm ${active
                                    ? "z-20 scale-110 border-[#c9ad4d] bg-[#f4e8b6] text-[#171717] shadow-xl"
                                    : "z-10 border-[#cfd6d0] bg-[#f7f8f5] text-[#344039] shadow-sm hover:scale-105 hover:border-[#9ba8a0] hover:bg-white"
                                }`}
                            style={{
                                left: `${position.x}%`,
                                top: `${position.y}%`,
                            }}
                        >
                            <span className="max-w-[105px]">
                                {concept.name}
                            </span>
                        </button>
                    );
                }
            )}

            {/* Information panel */}
            <div className="absolute bottom-5 left-5 right-5 rounded-[26px] border border-[#dedbd3] bg-white/95 p-5 shadow-sm backdrop-blur">
                {selected ? (
                    <>
                        <div className="text-[10px] font-semibold tracking-[0.25em] text-[#91a0b7]">
                            SELECTED CONCEPT
                        </div>

                        <div className="mt-2 text-xl font-bold">
                            {selected.name}
                        </div>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68778c]">
                            {selected.description ||
                                "No description available."}
                        </p>

                        {selected.prerequisites
                            ?.length > 0 && (
                                <div className="mt-3 text-xs text-[#8794a8]">
                                    <span className="font-semibold">
                                        Prerequisites:
                                    </span>{" "}
                                    {selected.prerequisites.join(
                                        ", "
                                    )}
                                </div>
                            )}
                    </>
                ) : (
                    <>
                        <div className="text-[10px] font-semibold tracking-[0.25em] text-[#91a0b7]">
                            KNOWLEDGE GRAPH
                        </div>

                        <div className="mt-2 text-lg font-bold">
                            Explore your concepts
                        </div>

                        <div className="mt-1 text-sm text-[#8794a8]">
                            Click a concept to see its role
                            in your learning path.
                        </div>

                        {graph && (
                            <div className="mt-3 text-xs text-[#9aa5b4]">
                                {graph.node_count ??
                                    concepts.length}{" "}
                                concepts ·{" "}
                                {graph.edge_count ??
                                    edges.length}{" "}
                                prerequisite connections
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function positionMap(
    positions,
    name
) {
    return positions[name];
}