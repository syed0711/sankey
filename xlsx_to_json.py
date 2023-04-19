# -*- coding: utf-8 -*-

import openpyxl
import json

def load_and_convert_xlsx(file_path):
    wb = openpyxl.load_workbook(file_path)
    sheet = wb.active

    nodes = []
    links = []

    for row in sheet.iter_rows(min_row=2, values_only=True):
        if row[0] is not None:
            node = {"node": row[0], "name": row[1]}
            nodes.append(node)
        else:
            link = {"source": row[2], "target": row[3], "value": row[4]}
            links.append(link)

    result = {"nodes": nodes, "links": links}
    
    return result

if __name__ == "__main__":
    file_path = "/datasets/original_dataset.xlsx"
    json_data = load_and_convert_xlsx(file_path)
    
    with open("output.json", "w") as f:
        json.dump(json_data, f, indent=4)

