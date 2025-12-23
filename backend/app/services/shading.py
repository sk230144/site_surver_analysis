def run_shading_analysis(roof_planes, obstructions):
    return {'summary':'Shading scaffold','planes':[{'plane_id':p['id'],'shade_risk':0.0} for p in roof_planes]}
