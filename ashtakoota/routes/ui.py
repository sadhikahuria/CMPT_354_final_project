from flask import Blueprint, render_template

from ..services.reference_service import get_registration_reference_options


ui_blueprint = Blueprint("ui", __name__, url_prefix="/ui")


@ui_blueprint.get("/")
def index():
    options = get_registration_reference_options()
    return render_template(
        "ui/index.html",
        rashis=options["rashis"],
        nakshatras=options["nakshatras"],
    )
