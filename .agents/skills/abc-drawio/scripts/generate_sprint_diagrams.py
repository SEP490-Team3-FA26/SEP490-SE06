# scripts/generate_sprint_diagrams.py
import os
import re
import html

def escape_xml(s):
    return html.escape(str(s), quote=True)

def generate_sequence_drawio(uc_data):
    uc_id = uc_data["id"]
    title = uc_data["title"]
    actor = uc_data.get("actor", "User")
    ui = uc_data.get("ui", "Web / Mobile Client")
    gateway = uc_data.get("gateway_name", "API Gateway")
    broker = uc_data.get("broker_name", "Kafka Broker")
    service = uc_data.get("service_name", "Microservice")
    db = uc_data.get("db_name", "MongoDB Database")
    steps = uc_data["steps"]

    total_steps = len(steps)
    step_gap = 50
    top_y = 135
    content_height = top_y + total_steps * step_gap + 40
    lifeline_height = content_height - 60

    lifelines = [
        {"id": "actor", "name": actor, "is_actor": True, "x": 40},
        {"id": "ui", "name": ui, "is_actor": False, "x": 220},
        {"id": "gateway", "name": gateway, "is_actor": False, "x": 400},
        {"id": "kafka", "name": broker, "is_actor": False, "x": 580},
        {"id": "service", "name": service, "is_actor": False, "x": 760},
        {"id": "db", "name": db, "is_actor": False, "x": 940},
    ]

    ll_map = {ll["id"]: ll["x"] + 50 for ll in lifelines}

    xml_lines = [
        '<mxfile host="app.diagrams.net">',
        f'<diagram id="seq_{uc_id}" name="Sequence Diagram - {uc_id}: {title}">',
        f'<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="1150" pageHeight="{content_height + 40}">',
        '<root>',
        '<mxCell id="0" />',
        '<mxCell id="1" parent="0" />',
        f'<mxCell id="title" value="&lt;b&gt;Sequence Diagram - {uc_id}: {title}&lt;/b&gt;" parent="1" vertex="1" style="html=1;whiteSpace=wrap;align=center;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;fontSize=13;fontStyle=1;">',
        f'<mxGeometry x="30" y="20" width="1030" height="40" as="geometry" />',
        '</mxCell>',
    ]

    for ll in lifelines:
        style = "shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;size=40;"
        if ll["is_actor"]:
            style += "participant=umlActor;verticalAlign=bottom;spacingBottom=-14;labelBackgroundColor=#ffffff;"
        xml_lines.append(
            f'<mxCell id="{ll["id"]}" value="{escape_xml(ll["name"])}" parent="1" vertex="1" style="{style}">'
            f'<mxGeometry x="{ll["x"]}" y="70" width="100" height="{lifeline_height}" as="geometry" />'
            f'</mxCell>'
        )

    current_y = top_y
    for idx, step in enumerate(steps):
        src_id = step["from"]
        dst_id = step["to"]
        msg_text = f'{idx + 1}. {step["text"]}'
        is_return = step.get("is_return", False)

        src_x = ll_map[src_id]
        dst_x = ll_map[dst_id]

        if is_return:
            edge_style = "html=1;verticalAlign=bottom;endArrow=open;dashed=1;curved=0;rounded=0;strokeColor=#888888;fontColor=#555555;fontSize=10;"
        else:
            edge_style = "html=1;verticalAlign=bottom;endArrow=block;curved=0;rounded=0;strokeColor=#333333;fontColor=#222222;fontSize=10;"

        xml_lines.append(
            f'<mxCell id="msg_{idx}" value="{escape_xml(msg_text)}" parent="1" edge="1" style="{edge_style}">'
            f'<mxGeometry relative="1" as="geometry">'
            f'<mxPoint x="{src_x}" y="{current_y}" as="sourcePoint" />'
            f'<mxPoint x="{dst_x}" y="{current_y}" as="targetPoint" />'
            f'</mxGeometry>'
            f'</mxCell>'
        )
        current_y += step_gap

    xml_lines.extend(['</root>', '</mxGraphModel>', '</diagram>', '</mxfile>'])
    return '\n'.join(xml_lines)


def generate_class_drawio(uc_data):
    uc_id = uc_data["id"]
    title = uc_data["title"]
    classes = uc_data["classes"]
    edges = uc_data.get("class_edges", [])

    col_coords = [40, 420, 800]
    row_coords = [80, 400]

    xml_lines = [
        '<mxfile host="app.diagrams.net">',
        f'<diagram id="cd_{uc_id}" name="Class Diagram - {uc_id}: {title}">',
        '<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="1200" pageHeight="780">',
        '<root>',
        '<mxCell id="0" />',
        '<mxCell id="1" parent="0" />',
        f'<mxCell id="title" value="&lt;b&gt;Class Diagram - {uc_id}: {title}&lt;/b&gt;" parent="1" vertex="1" style="html=1;whiteSpace=wrap;align=center;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;fontSize=13;fontStyle=1;">',
        '<mxGeometry x="30" y="20" width="1130" height="40" as="geometry" />',
        '</mxCell>',
    ]

    type_styles = {
        "DTO": {"fill": "#f8cecc", "stroke": "#b85450"},
        "Controller": {"fill": "#e1d5e7", "stroke": "#9673a6"},
        "Service": {"fill": "#dae8fc", "stroke": "#6c8ebf"},
        "Entity": {"fill": "#d5e8d4", "stroke": "#82b366"},
        "Schema": {"fill": "#d5e8d4", "stroke": "#82b366"},
        "Secondary": {"fill": "#fff2cc", "stroke": "#d6b656"},
    }

    class_id_map = {}

    for i, cls in enumerate(classes):
        cid = f"c_{i}"
        class_id_map[cls["name"]] = cid
        ctype = cls.get("type", "Entity")
        cname = cls["name"]
        attrs = cls.get("attributes", [])
        methods = cls.get("methods", [])

        grid_col = cls.get("col", i % 3)
        grid_row = cls.get("row", i // 3)
        x = col_coords[min(grid_col, 2)]
        y = row_coords[min(grid_row, 1)]
        w = 350

        style_cfg = type_styles.get(ctype, {"fill": "#dae8fc", "stroke": "#6c8ebf"})

        header_h = 44
        attr_h = max(34, len(attrs) * 18 + 14)
        method_h = max(34, len(methods) * 18 + 14)
        total_h = header_h + attr_h + method_h

        hdr_val = f"&lt;i&gt;&amp;lt;&amp;lt;{escape_xml(ctype)}&amp;gt;&amp;gt;&lt;/i&gt;&lt;br/&gt;&lt;b&gt;{escape_xml(cname)}&lt;/b&gt;"
        xml_lines.append(
            f'<mxCell id="{cid}" value="{hdr_val}" parent="1" vertex="1" style="swimlane;fontStyle=1;align=center;startSize={header_h};html=1;fillColor={style_cfg["fill"]};strokeColor={style_cfg["stroke"]};rounded=1;arcSize=4;shadow=1;fontSize=11;fontFamily=Helvetica;">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{total_h}" as="geometry" />'
            f'</mxCell>'
        )

        attr_lines = [f"+ {escape_xml(a)}" for a in attrs]
        attr_val = "&lt;hr/&gt;" + "&lt;br/&gt;".join(attr_lines)
        xml_lines.append(
            f'<mxCell id="{cid}_attrs" value="{attr_val}" parent="{cid}" vertex="1" style="text;html=1;whiteSpace=wrap;align=left;spacingLeft=8;spacingTop=4;fontSize=10;fontFamily=Helvetica;fillColor=none;strokeColor=none;">'
            f'<mxGeometry x="0" y="{header_h}" width="{w}" height="{attr_h}" as="geometry" />'
            f'</mxCell>'
        )

        method_lines = [f"+ {escape_xml(m)}" for m in methods]
        method_val = "&lt;hr/&gt;" + "&lt;br/&gt;".join(method_lines)
        xml_lines.append(
            f'<mxCell id="{cid}_methods" value="{method_val}" parent="{cid}" vertex="1" style="text;html=1;whiteSpace=wrap;align=left;spacingLeft=8;spacingTop=4;fontSize=10;fontFamily=Helvetica;fillColor=none;strokeColor=none;fontStyle=2;">'
            f'<mxGeometry x="0" y="{header_h + attr_h}" width="{w}" height="{method_h}" as="geometry" />'
            f'</mxCell>'
        )

    for e_idx, edge in enumerate(edges):
        src_cid = class_id_map.get(edge["from"])
        dst_cid = class_id_map.get(edge["to"])
        if src_cid and dst_cid:
            edge_lbl = f'{e_idx + 1}. {edge.get("label", "associates")}'
            xml_lines.append(
                f'<mxCell id="edge_{e_idx}" value="{escape_xml(edge_lbl)}" parent="1" source="{src_cid}" target="{dst_cid}" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#555555;fontColor=#333333;fontSize=9;labelBackgroundColor=#ffffff;">'
                f'<mxGeometry relative="1" as="geometry" />'
                f'</mxCell>'
            )

    xml_lines.extend(['</root>', '</mxGraphModel>', '</diagram>', '</mxfile>'])
    return '\n'.join(xml_lines)
